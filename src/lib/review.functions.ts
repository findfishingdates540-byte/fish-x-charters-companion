/**
 * Server functions for the angler "Leave a Review" screen.
 * All queries run as the signed-in user via requireSupabaseAuth (RLS applies).
 * One review per booking (booking_id is UNIQUE); a review is only allowed once
 * a trip is completed/reviewed.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

// Statuses from which an angler may leave a review.
const REVIEWABLE: BookingStatus[] = ["completed", "reviewed"];

/** One booking + its context (service/business/captain) + any existing review. */
export const getReviewContext = createServerFn({ method: "GET" })
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

    const [serviceRes, businessRes, captainRes, reviewRes] = await Promise.all([
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
      supabase.from("reviews").select("*").eq("booking_id", data.bookingId).maybeSingle(),
    ]);
    if (reviewRes.error) throw new Response(reviewRes.error.message, { status: 500 });

    return {
      booking,
      service: serviceRes.data,
      business: businessRes.data,
      captain: captainRes.data,
      review: reviewRes.data,
      viewerId: userId,
    };
  });

/** Submit a review for a completed/reviewed booking (one per booking). */
export const submitReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        bookingId: z.string().uuid(),
        rating: z.number().int().min(1).max(5),
        body: z.string().max(4000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Re-verify ownership + reviewable status server-side.
    const bookingRes = await supabase
      .from("bookings")
      .select("*")
      .eq("id", data.bookingId)
      .maybeSingle();
    if (bookingRes.error) throw new Response(bookingRes.error.message, { status: 500 });
    if (!bookingRes.data) throw new Response("Booking not found", { status: 404 });
    const booking = bookingRes.data;
    if (booking.angler_id !== userId) throw new Response("Forbidden", { status: 403 });
    if (!REVIEWABLE.includes(booking.status)) {
      throw new Response("This trip isn't ready for a review yet", { status: 400 });
    }

    const { data: review, error } = await supabase
      .from("reviews")
      .insert({
        booking_id: data.bookingId,
        angler_id: userId,
        business_id: booking.business_id!,
        rating: data.rating,
        body: data.body?.trim() || null,
      })
      .select("*")
      .single();
    if (error) {
      if (error.code === "23505") {
        throw new Response("You've already reviewed this trip", { status: 409 });
      }
      throw new Response(error.message, { status: 500 });
    }

    return { ok: true as const, review };
  });
