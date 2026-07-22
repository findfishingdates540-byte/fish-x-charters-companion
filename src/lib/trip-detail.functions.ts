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
