/**
 * Server functions for the angler booking flow (checkout + payment simulation).
 * Real Stripe wiring is TODO — this creates the booking row and moves it through
 * the state machine to `confirmed` with escrow_state='held' so the escrow
 * timeline in the UI reflects a real database row.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

export const getCheckoutContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ serviceId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: svc, error } = await supabase
      .from("bookable_services")
      .select(
        "id,title,hero_url,duration_minutes,base_price_cents,capacity,includes,departure_location,business_id,business:businesses(id,slug,name,city,region,logo_url,hero_url,created_by)",
      )
      .eq("id", data.serviceId)
      .maybeSingle();
    if (error) throw new Response(error.message, { status: 500 });
    if (!svc) throw new Response("Service not found", { status: 404 });
    return svc;
  });

const CreateBookingInput = z.object({
  serviceId: z.string().uuid(),
  tripDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  partySize: z.number().int().min(1).max(20),
  notes: z.string().max(2000).optional(),
  origin: z.string().url().optional(),
});


export const createBookingFromService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => CreateBookingInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Resolve service + business owner (captain_id is NOT NULL on bookings)
    const { data: svc, error: svcErr } = await supabase
      .from("bookable_services")
      .select("id,title,hero_url,base_price_cents,business_id,capacity,business:businesses(created_by)")
      .eq("id", data.serviceId)
      .maybeSingle();
    if (svcErr) throw new Response(svcErr.message, { status: 500 });
    if (!svc) throw new Response("Service not found", { status: 404 });
    if (data.partySize > (svc.capacity ?? 10)) {
      throw new Response("Party size exceeds capacity", { status: 400 });
    }
    const ownerId = (svc.business as { created_by: string } | null)?.created_by;
    if (!ownerId) throw new Response("Business owner missing", { status: 500 });

    const price = svc.base_price_cents ?? 0;
    const total = price;
    const { splitAmount } = await import("./stripe.server");
    const { platformFeeCents, vendorCents } = splitAmount(total);

    // Booking starts as pending_payment; the Stripe webhook flips it to
    // confirmed + escrow held once the PaymentIntent succeeds. Without a
    // Stripe key configured we short-circuit to confirmed so the flow is
    // still demoable in preview.
    const { getStripe } = await import("./stripe.server");
    const stripe = getStripe();

    const insert: Database["public"]["Tables"]["bookings"]["Insert"] = {
      angler_id: userId,
      captain_id: ownerId,
      business_id: svc.business_id,
      service_id: svc.id,
      trip_date: data.tripDate,
      start_time: data.startTime ? `${data.startTime}:00` : null,
      party_size: data.partySize,
      total_cents: total,
      deposit_cents: 0,
      payout_cents: vendorCents,
      application_fee_cents: platformFeeCents,
      commission_rate: 0.2,
      status: stripe ? "pending_payment" : "confirmed",
      escrow_state: stripe ? "none" : "held",
      instant_book: true,
      notes: data.notes ?? null,
    };
    const { data: row, error: insErr } = await supabase
      .from("bookings")
      .insert(insert)
      .select("id")
      .single();
    if (insErr) throw new Response(insErr.message, { status: 500 });

    let checkoutUrl: string | null = null;
    if (stripe) {
      // Funds are captured on the PLATFORM account (separate charges and
      // transfers) so the vendor's 80% can be held in escrow and transferred
      // 24h after the trip is completed.
      const origin = data.origin ?? "https://fishx-charter-hub.lovable.app";
      const metadata = {
        booking_id: row.id,
        business_id: svc.business_id ?? "",
        vendor_cents: String(vendorCents),
        platform_fee_cents: String(platformFeeCents),
      };
      const session = await stripe.checkout.sessions.create(
        {
          mode: "payment",
          line_items: [
            {
              quantity: 1,
              price_data: {
                currency: "usd",
                unit_amount: total,
                product_data: {
                  name: svc.title ?? "Fishing charter",
                  description: `${data.tripDate}${data.startTime ? ` · ${data.startTime}` : ""} · ${data.partySize} angler(s)`,
                  ...(svc.hero_url ? { images: [svc.hero_url] } : {}),
                },
              },
            },
          ],
          metadata,
          payment_intent_data: { metadata },
          success_url: `${origin}/booking?service_id=${svc.id}&paid=1&booking_id=${row.id}`,
          cancel_url: `${origin}/booking?service_id=${svc.id}&canceled=1`,
        },
        { idempotencyKey: `booking-checkout-${row.id}` },
      );
      checkoutUrl = session.url;
      if (typeof session.payment_intent === "string") {
        await supabase
          .from("bookings")
          .update({ stripe_payment_intent_id: session.payment_intent })
          .eq("id", row.id);
      }
    }

    return {
      bookingId: row.id,
      totalCents: total,
      feeCents: platformFeeCents,
      vendorCents,
      checkoutUrl,
    };
  });

