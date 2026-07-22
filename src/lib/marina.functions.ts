/**
 * Marina dashboard server functions: slips, reservations, KPIs.
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

export const getMarinaOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { businessId: string }) =>
    z.object({ businessId: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertMember(context, data.businessId);
    const { supabase } = context;

    const [{ data: slips }, { data: reservations }] = await Promise.all([
      supabase
        .from("marina_slips")
        .select("id, slip_number, status, monthly_rate_cents, nightly_rate_cents")
        .eq("business_id", data.businessId),
      supabase
        .from("marina_reservations")
        .select(
          "id, vessel_name, captain_name, arrive_date, depart_date, total_cents, status, slip:marina_slips(slip_number)",
        )
        .eq("business_id", data.businessId)
        .order("arrive_date", { ascending: false })
        .limit(50),
    ]);

    const total = slips?.length ?? 0;
    const occupied = slips?.filter((s: any) => s.status === "occupied").length ?? 0;
    const reserved = slips?.filter((s: any) => s.status === "reserved").length ?? 0;
    const maintenance = slips?.filter((s: any) => s.status === "maintenance").length ?? 0;
    const available = total - occupied - reserved - maintenance;

    const monthGross =
      reservations
        ?.filter(
          (r: any) =>
            r.status !== "cancelled" &&
            new Date(r.arrive_date).getMonth() === new Date().getMonth(),
        )
        .reduce((acc: number, r: any) => acc + (r.total_cents ?? 0), 0) ?? 0;

    return {
      counts: { total, occupied, reserved, available, maintenance },
      monthGrossCents: monthGross,
      slips: slips ?? [],
      reservations: reservations ?? [],
    };
  });

export const upsertSlip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        id: z.string().uuid().optional(),
        businessId: z.string().uuid(),
        slipNumber: z.string().min(1).max(10),
        lengthFt: z.number().nullable().optional(),
        beamFt: z.number().nullable().optional(),
        amperage: z.string().optional(),
        monthlyRateCents: z.number().int().nullable().optional(),
        nightlyRateCents: z.number().int().nullable().optional(),
        status: z.enum(["available", "occupied", "reserved", "maintenance"]),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertMember(context, data.businessId);
    const payload = {
      business_id: data.businessId,
      slip_number: data.slipNumber,
      length_ft: data.lengthFt ?? null,
      beam_ft: data.beamFt ?? null,
      amperage: data.amperage ?? null,
      monthly_rate_cents: data.monthlyRateCents ?? null,
      nightly_rate_cents: data.nightlyRateCents ?? null,
      status: data.status,
    };
    const q = data.id
      ? context.supabase
          .from("marina_slips")
          .update(payload)
          .eq("id", data.id)
          .select()
          .single()
      : context.supabase.from("marina_slips").insert(payload).select().single();
    const { data: row, error } = await q;
    if (error) throw new Response(error.message, { status: 400 });
    return row;
  });

export const deleteSlip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({ id: z.string().uuid(), businessId: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertMember(context, data.businessId);
    const { error } = await context.supabase
      .from("marina_slips")
      .delete()
      .eq("id", data.id);
    if (error) throw new Response(error.message, { status: 400 });
    return { ok: true };
  });

export const upsertReservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        id: z.string().uuid().optional(),
        businessId: z.string().uuid(),
        slipId: z.string().uuid().nullable().optional(),
        vesselName: z.string().min(1).max(120),
        captainName: z.string().max(120).optional(),
        arriveDate: z.string(),
        departDate: z.string(),
        nightlyRateCents: z.number().int().optional(),
        totalCents: z.number().int().optional(),
        status: z.enum(["pending", "confirmed", "checked_in", "checked_out", "cancelled"]),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertMember(context, data.businessId);
    const payload = {
      business_id: data.businessId,
      slip_id: data.slipId ?? null,
      vessel_name: data.vesselName,
      captain_name: data.captainName ?? null,
      arrive_date: data.arriveDate,
      depart_date: data.departDate,
      nightly_rate_cents: data.nightlyRateCents ?? null,
      total_cents: data.totalCents ?? null,
      status: data.status,
    };
    const q = data.id
      ? context.supabase
          .from("marina_reservations")
          .update(payload)
          .eq("id", data.id)
          .select()
          .single()
      : context.supabase
          .from("marina_reservations")
          .insert(payload)
          .select()
          .single();
    const { data: row, error } = await q;
    if (error) throw new Response(error.message, { status: 400 });
    return row;
  });
