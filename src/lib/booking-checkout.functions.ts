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
        "id,title,hero_url,duration_minutes,base_price_cents,max_party,includes,departure_location,business_id,business:businesses(id,slug,name,city,region,logo_url,hero_url,owner_id)",
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
  partySize: z.number().int().min(1).max(20),
  notes: z.string().max(2000).optional(),
});

export const createBookingFromService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => CreateBookingInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Resolve service + business owner (captain_id is NOT NULL on bookings)
    const { data: svc, error: svcErr } = await supabase
      .from("bookable_services")
      .select("id,base_price_cents,business_id,max_party,business:businesses(owner_id)")
      .eq("id", data.serviceId)
      .maybeSingle();
    if (svcErr) throw new Response(svcErr.error?.message ?? svcErr.message, { status: 500 });
    if (!svc) throw new Response("Service not found", { status: 404 });
    if (data.partySize > (svc.max_party ?? 10)) {
      throw new Response("Party size exceeds capacity", { status: 400 });
    }
    const ownerId = (svc.business as { owner_id: string } | null)?.owner_id;
    if (!ownerId) throw new Response("Business owner missing", { status: 500 });

    const price = svc.base_price_cents ?? 0;
    const fee = Math.round(price * 0.08);
    const total = price + fee;

    // Create booking directly at 'confirmed' with escrow held.
    // Real Stripe wiring will move: pending_payment -> pending_confirmation -> confirmed
    const insert: Database["public"]["Tables"]["bookings"]["Insert"] = {
      angler_id: userId,
      captain_id: ownerId,
      business_id: svc.business_id,
      service_id: svc.id,
      trip_date: data.tripDate,
      party_size: data.partySize,
      total_cents: total,
      deposit_cents: 0,
      payout_cents: price,
      application_fee_cents: fee,
      status: "confirmed",
      escrow_state: "held",
      instant_book: true,
      notes: data.notes ?? null,
    };
    const { data: row, error: insErr } = await supabase
      .from("bookings")
      .insert(insert)
      .select("id")
      .single();
    if (insErr) throw new Response(insErr.message, { status: 500 });
    return { bookingId: row.id, totalCents: total, feeCents: fee };
  });
