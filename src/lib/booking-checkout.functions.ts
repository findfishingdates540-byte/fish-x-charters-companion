/**
 * Server functions for the angler booking flow.
 *
 * Slot-safe by construction: seats are reserved through the `reserve_slot`
 * RPC (row lock + seat assertion + 15-minute soft hold + idempotency key)
 * before Stripe is ever touched. The Stripe webhook is the source of truth
 * for payment outcome and calls `settlePaidBooking`, which routes the booking
 * to `confirmed` (instant book) or `pending_confirmation` (request to book).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getCheckoutContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ serviceId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: svc, error } = await supabase
      .from("bookable_services")
      .select(
        "id,title,hero_url,duration_minutes,base_price_cents,capacity,includes,departure_location,business_id,instant_book,accept_window_hours,cancellation_policy,business:businesses(id,slug,name,city,region,logo_url,hero_url,created_by)",
      )
      .eq("id", data.serviceId)
      .maybeSingle();
    if (error) throw new Response(error.message, { status: 500 });
    if (!svc) throw new Response("Service not found", { status: 404 });

    const { data: slots } = await supabase
      .from("service_availability")
      .select("id,starts_at,ends_at,seats_available,seats_booked,price_cents")
      .eq("service_id", data.serviceId)
      .eq("is_blackout", false)
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(60);

    const openSlots = (slots ?? [])
      .map((s) => ({
        id: s.id,
        startsAt: s.starts_at,
        endsAt: s.ends_at,
        seatsLeft: (s.seats_available ?? 0) - (s.seats_booked ?? 0),
        priceCents: s.price_cents ?? svc.base_price_cents ?? 0,
      }))
      .filter((s) => s.seatsLeft > 0);

    // Sibling trip packages from the same operator — the angler can swap
    // between them on the detail page without losing their place.
    const [packagesRes, addonsRes] = await Promise.all([
      supabase
        .from("bookable_services")
        .select("id,title,duration_minutes,base_price_cents,capacity,hero_url,target_species,description")
        .eq("business_id", svc.business_id)
        .eq("is_published", true)
        .order("base_price_cents", { ascending: true })
        .limit(12),
      (supabase as any)
        .from("service_addons")
        .select("id,title,description,price_cents,unit,sort_order")
        .eq("service_id", data.serviceId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
    ]);

    return {
      ...svc,
      openSlots,
      packages: packagesRes.data ?? [],
      addons: (addonsRes.data ?? []) as Array<{
        id: string;
        title: string;
        description: string | null;
        price_cents: number;
        unit: "per_trip" | "per_person";
        sort_order: number;
      }>,
    };
  });


const CreateBookingInput = z.object({
  slotId: z.string().uuid(),
  partySize: z.number().int().min(1).max(50),
  notes: z.string().max(2000).optional(),
  origin: z.string().url().optional(),
  /** Client-generated; a retry returns the original booking. */
  idempotencyKey: z.string().min(8).max(120),
});

export const createBookingFromService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => CreateBookingInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    // 1) Reserve the seats atomically. Throws if the slot is full/blacked out.
    const { data: booking, error: rpcErr } = await supabase.rpc("reserve_slot", {
      _slot_id: data.slotId,
      _party_size: data.partySize,
      _idempotency_key: data.idempotencyKey,
      _notes: data.notes ?? undefined,
      _hold_minutes: 15,
    });
    if (rpcErr) throw new Response(rpcErr.message, { status: 400 });
    if (!booking) throw new Response("Could not reserve this slot", { status: 400 });

    const row = booking as unknown as {
      id: string;
      total_cents: number;
      deposit_cents: number;
      balance_due_cents: number | null;
      payout_cents: number;
      application_fee_cents: number | null;
      party_size: number;
      trip_date: string;
      start_time: string | null;
      instant_book: boolean;
      service_id: string | null;
      stripe_payment_intent_id: string | null;
      hold_expires_at: string | null;
    };

    // Only the deposit is charged online; the captain collects the balance
    // on the day of the trip (cash, card, split cards, tips).
    const chargeCents = row.deposit_cents > 0 ? row.deposit_cents : row.total_cents;
    const balanceCents = row.balance_due_cents ?? Math.max(row.total_cents - chargeCents, 0);

    const { data: svc } = await supabase
      .from("bookable_services")
      .select("title,hero_url")
      .eq("id", row.service_id ?? "")
      .maybeSingle();

    const { getStripe } = await import("./stripe.server");
    const stripe = getStripe();

    const result = {
      bookingId: row.id,
      totalCents: row.total_cents,
      depositCents: chargeCents,
      balanceDueCents: balanceCents,
      feeCents: row.application_fee_cents ?? 0,
      vendorCents: row.payout_cents,
      instantBook: row.instant_book,
      holdExpiresAt: row.hold_expires_at,
    };

    // 2) Without Stripe configured (preview), settle immediately so the flow
    //    stays demoable; otherwise Stripe + the webhook drive the state.
    if (!stripe) {
      const { settlePaidBooking } = await import("./booking-settle.server");
      await settlePaidBooking(supabase as never, row.id);
      return { ...result, checkoutUrl: null as string | null };
    }

    const origin = data.origin ?? "https://fishx-charter-hub.lovable.app";
    const metadata = {
      booking_id: row.id,
      slot_id: data.slotId,
      deposit_cents: String(chargeCents),
      balance_due_cents: String(balanceCents),
      vendor_cents: String(row.payout_cents),
      platform_fee_cents: String(row.application_fee_cents ?? 0),
    };

    const money = (c: number) => `$${(c / 100).toFixed(2)}`;
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: chargeCents,
              product_data: {
                name: `Deposit — ${svc?.title ?? "Fishing charter"}`,
                description:
                  `${row.trip_date}${row.start_time ? ` · ${row.start_time.slice(0, 5)}` : ""} · ${row.party_size} angler(s)` +
                  (balanceCents > 0
                    ? ` · Trip total ${money(row.total_cents)}, balance of ${money(balanceCents)} paid to the captain on the day`
                    : ""),
                ...(svc?.hero_url ? { images: [svc.hero_url] } : {}),
              },
            },
          },
        ],
        metadata,
        payment_intent_data: {
          metadata,
          // Request-to-book authorises now and captures on acceptance (spec §2.4).
          ...(row.instant_book ? {} : { capture_method: "manual" as const }),
        },
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
        success_url: `${origin}/booking?service_id=${row.service_id}&paid=1&booking_id=${row.id}`,
        cancel_url: `${origin}/booking?service_id=${row.service_id}&canceled=1`,
      },
      { idempotencyKey: `booking-checkout-${row.id}` },
    );

    if (typeof session.payment_intent === "string") {
      await supabase
        .from("bookings")
        .update({ stripe_payment_intent_id: session.payment_intent })
        .eq("id", row.id);
    }

    return { ...result, checkoutUrl: session.url };
  });

