/**
 * Server functions for the angler trip-detail page.
 * All queries run as the signed-in user via requireSupabaseAuth (RLS applies).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

export const getTripDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const bookingRes = await supabase
      .from("bookings")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();

    if (bookingRes.error) throw new Response(bookingRes.error.message, { status: 500 });
    if (!bookingRes.data) throw new Response("Booking not found", { status: 404 });
    const booking = bookingRes.data;
    if (booking.angler_id !== userId) {
      throw new Response("Forbidden", { status: 403 });
    }

    const [serviceRes, businessRes, captainRes, messagesRes] = await Promise.all([
      booking.service_id
        ? supabase
            .from("bookable_services")
            .select("id,title,hero_url,departure_location,duration_minutes,includes")
            .eq("id", booking.service_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      booking.business_id
        ? supabase
            .from("businesses")
            .select("id,slug,name,city,region,hero_url,logo_url,verified_at")
            .eq("id", booking.business_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase
        .from("profiles")
        .select("id,full_name,display_name,avatar_url")
        .eq("id", booking.captain_id)
        .maybeSingle(),
      supabase
        .from("booking_messages")
        .select("id,body,sender_id,created_at")
        .eq("booking_id", data.id)
        .order("created_at", { ascending: true })
        .limit(200),
    ]);
    if (messagesRes.error) throw new Response(messagesRes.error.message, { status: 500 });

    return {
      booking,
      service: serviceRes.data,
      business: businessRes.data,
      captain: captainRes.data,
      messages: messagesRes.data ?? [],
      viewerId: userId,
    };
  });

export const sendTripMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ bookingId: z.string().uuid(), body: z.string().min(1).max(2000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("booking_messages").insert({
      booking_id: data.bookingId,
      sender_id: userId,
      body: data.body.trim(),
    });
    if (error) throw new Response(error.message, { status: 500 });
    return { ok: true as const };
  });

export const cancelTrip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ bookingId: z.string().uuid(), reason: z.string().max(500).optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const to: BookingStatus = "cancelled_angler";
    const { data: row, error } = await supabase.rpc("transition_booking", {
      _booking_id: data.bookingId,
      _to_status: to,
      _reason: data.reason,
      _metadata: {},
    });
    if (error) throw new Response(error.message, { status: 400 });
    return { ok: true as const, booking: row };
  });

/** Policy + open departures for the self-serve reschedule flow. */
export const getRescheduleOptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ bookingId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const bookingRes = await supabase
      .from("bookings")
      .select("id,angler_id,service_id,slot_id,status,party_size,trip_date,start_time,deposit_cents")
      .eq("id", data.bookingId)
      .maybeSingle();
    if (bookingRes.error) throw new Response(bookingRes.error.message, { status: 500 });
    const booking = bookingRes.data;
    if (!booking) throw new Response("Booking not found", { status: 404 });
    if (booking.angler_id !== userId) throw new Response("Forbidden", { status: 403 });

    let departsAt: string | null = null;
    if (booking.slot_id) {
      const slot = await supabase
        .from("service_availability")
        .select("starts_at")
        .eq("id", booking.slot_id)
        .maybeSingle();
      departsAt = slot.data?.starts_at ?? null;
    }
    if (!departsAt) {
      departsAt = new Date(`${booking.trip_date}T${booking.start_time ?? "06:00:00"}Z`).toISOString();
    }
    const hoursUntil = (new Date(departsAt).getTime() - Date.now()) / 3_600_000;

    const usedRes = await supabase
      .from("booking_transitions")
      .select("id", { count: "exact", head: true })
      .eq("booking_id", data.bookingId)
      .like("reason", "reschedule%");
    const used = usedRes.count ?? 0;

    const reschedulable =
      (booking.status === "confirmed" || booking.status === "pending_confirmation") &&
      hoursUntil >= 48 &&
      used < 2;

    let slots: Array<{
      id: string;
      starts_at: string;
      ends_at: string;
      seats_available: number;
      seats_booked: number;
      price_cents: number | null;
    }> = [];
    if (booking.service_id) {
      const slotsRes = await supabase.rpc("public_service_slots", { _service_id: booking.service_id });
      if (!slotsRes.error) {
        slots = (slotsRes.data ?? [])
          .filter(
            (s) =>
              s.id !== booking.slot_id &&
              s.seats_available - s.seats_booked >= booking.party_size &&
              new Date(s.starts_at).getTime() - Date.now() > 48 * 3_600_000,
          )
          .slice(0, 40);
      }
    }

    return {
      departsAt,
      hoursUntil,
      reschedulesUsed: used,
      reschedulesAllowed: 2,
      reschedulable,
      freeWindow: hoursUntil >= 7 * 24,
      status: booking.status,
      partySize: booking.party_size,
      depositCents: booking.deposit_cents,
      slots,
    };
  });

/** Move a booking to another open departure of the same listing. */
export const rescheduleTrip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        bookingId: z.string().uuid(),
        slotId: z.string().uuid(),
        reason: z.string().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase.rpc("reschedule_booking", {
      _booking_id: data.bookingId,
      _slot_id: data.slotId,
      _reason: data.reason,
    });
    if (error) {
      const m = error.message;
      const friendly = m.includes("RESCHEDULE_WINDOW_CLOSED")
        ? "Inside 48 hours a trip can no longer be moved on your own — message your captain."
        : m.includes("RESCHEDULE_LIMIT")
          ? "You've already moved this trip twice. Message your captain to arrange another date."
          : m.includes("SLOT_CONFLICT")
            ? "SLOT_CONFLICT: that departure just filled up. Pick another time."
            : m.includes("RESCHEDULE_NOT_ALLOWED")
              ? "This booking can't be rescheduled in its current state."
              : m;
      throw new Response(friendly, { status: 400 });
    }
    return { ok: true as const, booking: row };
  });
