/**
 * Server functions for the angler "Cancel Booking" screen.
 * All queries run as the signed-in user via requireSupabaseAuth (RLS applies).
 * Booking state changes always go through the transition_booking RPC so the
 * audit trail + outbox stay consistent (never a direct UPDATE on bookings).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

// Statuses from which an angler may still cancel their own booking.
const CANCELLABLE: BookingStatus[] = ["pending_payment", "pending_confirmation", "confirmed"];

/** One booking + its trip context, plus whether the angler can still cancel. */
export const getCancelContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ bookingId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const bookingRes = await supabase
      .from("bookings")
      .select("*")
      .eq("id", data.bookingId)
      .maybeSingle();
    if (bookingRes.error) throw new Response(bookingRes.error.message, { status: 500 });
    if (!bookingRes.data) throw new Response("Booking not found", { status: 404 });
    const booking = bookingRes.data;
    if (booking.angler_id !== userId) throw new Response("Forbidden", { status: 403 });

    const [serviceRes, businessRes, captainRes] = await Promise.all([
      booking.service_id
        ? supabase
            .from("bookable_services")
            .select("id,title,hero_url,departure_location")
            .eq("id", booking.service_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      booking.business_id
        ? supabase
            .from("businesses")
            .select("id,name,city,region")
            .eq("id", booking.business_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase
        .from("profiles")
        .select("id,full_name,display_name,avatar_url")
        .eq("id", booking.captain_id)
        .maybeSingle(),
    ]);

    const cancellable = CANCELLABLE.includes(booking.status);

    return {
      booking,
      service: serviceRes.data,
      business: businessRes.data,
      captain: captainRes.data,
      cancellable,
      viewerId: userId,
    };
  });

/** Cancel a booking as the angler: transition it to `cancelled_angler`. */
export const cancelBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({ bookingId: z.string().uuid(), reason: z.string().max(500).optional() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const bookingRes = await supabase
      .from("bookings")
      .select("id,angler_id,status")
      .eq("id", data.bookingId)
      .maybeSingle();
    if (bookingRes.error) throw new Response(bookingRes.error.message, { status: 500 });
    if (!bookingRes.data) throw new Response("Booking not found", { status: 404 });
    const booking = bookingRes.data;
    if (booking.angler_id !== userId) throw new Response("Forbidden", { status: 403 });
    if (!CANCELLABLE.includes(booking.status)) {
      throw new Response("This booking can no longer be cancelled", { status: 400 });
    }

    const to: BookingStatus = "cancelled_angler";
    const reason = data.reason?.trim() || "Cancelled by angler";
    const { error: transErr } = await supabase.rpc("transition_booking", {
      _booking_id: data.bookingId,
      _to_status: to,
      _reason: reason,
      _metadata: { reason: data.reason?.trim() ?? null } as never,
    });
    if (transErr) throw new Response(transErr.message, { status: 400 });

    return { ok: true as const };
  });
