/**
 * Guide-service dashboard server functions:
 * roster (business_members + profiles), trips (bookings with assigned_guide_id),
 * availability slots, and pending requests.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertMember(
  ctx: { supabase: any; userId: string },
  businessId: string,
) {
  const { data, error } = await ctx.supabase.rpc("is_business_member", {
    _business_id: businessId,
    _user_id: ctx.userId,
    _min_role: "staff",
  });
  if (error) throw new Response(error.message, { status: 500 });
  if (!data) throw new Response("Forbidden", { status: 403 });
}

export const getGuideOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { businessId: string }) =>
    z.object({ businessId: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertMember(context, data.businessId);
    const { supabase } = context;

    const [
      { data: members },
      { data: bookings },
      { data: slots },
    ] = await Promise.all([
      supabase
        .from("business_members")
        .select("user_id, role, created_at")
        .eq("business_id", data.businessId),
      supabase
        .from("bookings")
        .select(
          "id, trip_date, start_time, party_size, status, total_cents, escrow_state, assigned_guide_id, notes, service_id, angler_id, created_at",
        )
        .eq("business_id", data.businessId)
        .order("trip_date", { ascending: true })
        .limit(200),
      supabase
        .from("guide_availability")
        .select(
          "id, service_id, slot_date, start_time, end_time, capacity, booked_count, price_cents, status, notes",
        )
        .eq("business_id", data.businessId)
        .order("slot_date", { ascending: true })
        .limit(200),
    ]);

    // Fetch profiles for members + assigned guides + anglers
    const userIds = new Set<string>();
    (members ?? []).forEach((m: any) => userIds.add(m.user_id));
    (bookings ?? []).forEach((b: any) => {
      if (b.assigned_guide_id) userIds.add(b.assigned_guide_id);
      if (b.angler_id) userIds.add(b.angler_id);
    });

    const profileMap = new Map<string, any>();
    if (userIds.size) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, display_name, avatar_url")
        .in("id", Array.from(userIds));
      (profiles ?? []).forEach((p: any) => profileMap.set(p.id, p));
    }

    const roster = (members ?? []).map((m: any) => {
      const p = profileMap.get(m.user_id);
      const name =
        p?.display_name || p?.full_name || "Team member";
      const trips = (bookings ?? []).filter(
        (b: any) => b.assigned_guide_id === m.user_id,
      );
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const mtd = trips
        .filter(
          (b: any) =>
            new Date(b.created_at) >= monthStart &&
            b.status !== "cancelled_angler" &&
            b.status !== "cancelled_captain" &&
            b.status !== "declined",
        )
        .reduce((acc: number, b: any) => acc + (b.total_cents ?? 0), 0);
      return {
        userId: m.user_id,
        role: m.role,
        name,
        avatarUrl: p?.avatar_url ?? null,
        tripsCount: trips.length,
        monthEarningsCents: mtd,
      };
    });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const active = (bookings ?? []).filter(
      (b: any) =>
        b.status !== "cancelled_angler" &&
        b.status !== "cancelled_captain" &&
        b.status !== "declined" &&
        b.status !== "expired",
    );
    const monthGross = active
      .filter((b: any) => new Date(b.created_at) >= monthStart)
      .reduce((a: number, b: any) => a + (b.total_cents ?? 0), 0);
    const weekTrips = active.filter((b: any) => {
      const d = new Date(b.trip_date);
      return d >= weekStart && d < weekEnd;
    }).length;
    const escrow = active
      .filter((b: any) => b.escrow_state === "held")
      .reduce((a: number, b: any) => a + (b.total_cents ?? 0), 0);
    const unassignedCount = active.filter(
      (b: any) => !b.assigned_guide_id && b.status !== "completed",
    ).length;

    const trips = (bookings ?? []).map((b: any) => ({
      ...b,
      angler: b.angler_id ? profileMap.get(b.angler_id) : null,
      guide: b.assigned_guide_id ? profileMap.get(b.assigned_guide_id) : null,
    }));

    const requests = trips.filter(
      (t: any) =>
        t.status === "inquiry" || t.status === "pending_confirmation",
    );

    return {
      trips,
      slots: slots ?? [],
      roster,
      requests,
      kpis: {
        monthGrossCents: monthGross,
        weekTripsCount: weekTrips,
        escrowCents: escrow,
        unassignedCount,
        rosterCount: roster.length,
      },
    };
  });

export const assignGuideToBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        bookingId: z.string().uuid(),
        businessId: z.string().uuid(),
        guideId: z.string().uuid().nullable(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertMember(context, data.businessId);
    const { data: row, error } = await context.supabase
      .from("bookings")
      .update({ assigned_guide_id: data.guideId })
      .eq("id", data.bookingId)
      .eq("business_id", data.businessId)
      .select()
      .single();
    if (error) throw new Response(error.message, { status: 400 });
    return row;
  });

export const upsertGuideSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        id: z.string().uuid().optional(),
        businessId: z.string().uuid(),
        serviceId: z.string().uuid().optional().nullable(),
        slotDate: z.string(),
        startTime: z.string(),
        endTime: z.string(),
        capacity: z.number().int().min(1),
        priceCents: z.number().int().min(0),
        status: z.enum(["open", "held", "closed"]).default("open"),
        notes: z.string().max(500).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertMember(context, data.businessId);
    const payload = {
      business_id: data.businessId,
      service_id: data.serviceId ?? null,
      slot_date: data.slotDate,
      start_time: data.startTime,
      end_time: data.endTime,
      capacity: data.capacity,
      price_cents: data.priceCents,
      status: data.status,
      notes: data.notes ?? null,
    };
    const q = data.id
      ? context.supabase
          .from("guide_availability")
          .update(payload)
          .eq("id", data.id)
          .select()
          .single()
      : context.supabase
          .from("guide_availability")
          .insert(payload)
          .select()
          .single();
    const { data: row, error } = await q;
    if (error) throw new Response(error.message, { status: 400 });
    return row;
  });

export const deleteGuideSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({ id: z.string().uuid(), businessId: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertMember(context, data.businessId);
    const { error } = await context.supabase
      .from("guide_availability")
      .delete()
      .eq("id", data.id)
      .eq("business_id", data.businessId);
    if (error) throw new Response(error.message, { status: 400 });
    return { ok: true };
  });
