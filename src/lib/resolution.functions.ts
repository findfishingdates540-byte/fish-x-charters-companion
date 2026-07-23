/**
 * Server functions for the angler Resolution Center.
 * All queries run as the signed-in user via requireSupabaseAuth (RLS applies).
 * Booking state changes always go through the transition_booking RPC so the
 * audit trail + outbox stay consistent (never a direct UPDATE on bookings).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

// Statuses from which an angler can meaningfully raise / hold a case.
const DISPUTABLE: BookingStatus[] = ["in_progress", "completed", "reviewed", "disputed"];

/** Bookings the signed-in angler could open (or already has) a case on. */
export const listDisputableBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const bookingsRes = await supabase
      .from("bookings")
      .select(
        "id,status,trip_date,start_time,party_size,total_cents,service_id,business_id,captain_id",
      )
      .eq("angler_id", userId)
      .in("status", DISPUTABLE)
      .order("trip_date", { ascending: false })
      .limit(50);
    if (bookingsRes.error) throw new Response(bookingsRes.error.message, { status: 500 });
    const bookings = bookingsRes.data ?? [];
    if (bookings.length === 0) return { bookings: [] };

    const serviceIds = [...new Set(bookings.map((b) => b.service_id).filter(Boolean))] as string[];
    const businessIds = [...new Set(bookings.map((b) => b.business_id).filter(Boolean))] as string[];
    const captainIds = [...new Set(bookings.map((b) => b.captain_id).filter(Boolean))] as string[];

    const [servicesRes, businessesRes, captainsRes] = await Promise.all([
      serviceIds.length
        ? supabase.from("bookable_services").select("id,title,hero_url").in("id", serviceIds)
        : Promise.resolve({ data: [], error: null }),
      businessIds.length
        ? supabase.from("businesses").select("id,name").in("id", businessIds)
        : Promise.resolve({ data: [], error: null }),
      captainIds.length
        ? supabase.from("profiles").select("id,full_name,display_name").in("id", captainIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const services = new Map((servicesRes.data ?? []).map((s) => [s.id, s]));
    const businesses = new Map((businessesRes.data ?? []).map((b) => [b.id, b]));
    const captains = new Map((captainsRes.data ?? []).map((c) => [c.id, c]));

    return {
      bookings: bookings.map((b) => ({
        ...b,
        service: b.service_id ? services.get(b.service_id) ?? null : null,
        business: b.business_id ? businesses.get(b.business_id) ?? null : null,
        captain: b.captain_id ? captains.get(b.captain_id) ?? null : null,
      })),
    };
  });

/** One booking + its live dispute (if any) + the case thread. */
export const getResolutionContext = createServerFn({ method: "GET" })
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

    const [serviceRes, businessRes, captainRes, disputeRes, messagesRes] = await Promise.all([
      booking.service_id
        ? supabase
            .from("bookable_services")
            .select("id,title,hero_url,departure_location")
            .eq("id", booking.service_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      booking.business_id
        ? supabase.from("businesses").select("id,name,city,region").eq("id", booking.business_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase
        .from("profiles")
        .select("id,full_name,display_name,avatar_url")
        .eq("id", booking.captain_id)
        .maybeSingle(),
      // Latest non-terminal dispute for this booking (RLS restricts to booking parties).
      supabase
        .from("disputes")
        .select("*")
        .eq("booking_id", data.bookingId)
        .in("status", ["open", "under_review"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("booking_messages")
        .select("id,body,sender_id,created_at")
        .eq("booking_id", data.bookingId)
        .order("created_at", { ascending: true })
        .limit(200),
    ]);
    if (messagesRes.error) throw new Response(messagesRes.error.message, { status: 500 });

    return {
      booking,
      service: serviceRes.data,
      business: businessRes.data,
      captain: captainRes.data,
      dispute: disputeRes.data,
      messages: messagesRes.data ?? [],
      viewerId: userId,
    };
  });

/** Open a case: insert a dispute, move the booking to `disputed`, seed the thread. */
export const openDispute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        bookingId: z.string().uuid(),
        kind: z.string().min(1).max(120),
        description: z.string().max(4000).optional(),
        requestedOutcome: z.string().min(1).max(120),
        evidence: z.array(z.string()).max(10).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: dispute, error: disputeErr } = await supabase
      .from("disputes")
      .insert({
        booking_id: data.bookingId,
        opened_by: userId,
        opened_by_kind: "angler",
        kind: data.kind,
        description: data.description ?? null,
        status: "open",
        metadata: {
          requested_outcome: data.requestedOutcome,
          evidence: data.evidence ?? [],
        },
      })
      .select("*")
      .single();
    if (disputeErr) throw new Response(disputeErr.message, { status: 500 });

    const to: BookingStatus = "disputed";
    const { error: transErr } = await supabase.rpc("transition_booking", {
      _booking_id: data.bookingId,
      _to_status: to,
      _reason: `Dispute opened by angler: ${data.kind}`,
      _metadata: { dispute_id: dispute.id, requested_outcome: data.requestedOutcome } as never,
    });
    if (transErr) throw new Response(transErr.message, { status: 400 });

    // Seed the case thread with the angler's statement so both sides see it.
    if (data.description && data.description.trim()) {
      await supabase.from("booking_messages").insert({
        booking_id: data.bookingId,
        sender_id: userId,
        body: data.description.trim(),
      });
    }

    return { ok: true as const, dispute };
  });

/** Add a message to the case thread. */
export const addCaseMessage = createServerFn({ method: "POST" })
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

/** Withdraw a case: mark the dispute withdrawn and release the booking hold. */
export const withdrawDispute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ bookingId: z.string().uuid(), disputeId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    // The disputes UPDATE policy is admin-only, so withdrawal runs through the
    // withdraw_dispute SECURITY DEFINER RPC (it verifies caller == opener).
    const { error: wdErr } = await supabase.rpc("withdraw_dispute", {
      _dispute_id: data.disputeId,
    });
    if (wdErr) throw new Response(wdErr.message, { status: 400 });

    // `disputed -> completed` is the only un-dispute path in the state machine.
    const to: BookingStatus = "completed";
    const { error: transErr } = await supabase.rpc("transition_booking", {
      _booking_id: data.bookingId,
      _to_status: to,
      _reason: "Dispute withdrawn by angler",
      _metadata: { dispute_id: data.disputeId } as never,
    });
    if (transErr) throw new Response(transErr.message, { status: 400 });

    return { ok: true as const };
  });
