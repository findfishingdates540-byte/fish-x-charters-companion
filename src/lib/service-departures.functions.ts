/**
 * Recurring weekly departure times for charter trips.
 * Business-scoped CRUD (mirrors service_addons RLS pattern).
 *
 * `days_of_week`: 0 = Sun … 6 = Sat (Postgres smallint[]).
 * `start_time`:   operator's local wall-clock time (e.g. "07:00").
 * `label`:        optional human-readable label (e.g. "Morning", "Sunset").
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function pickBusinessId(supabase: any, userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("business_members")
    .select("role,business_id")
    .eq("user_id", userId);
  if (error) throw new Response(error.message, { status: 500 });
  const primary = (data ?? []).find((m: any) => m.role === "owner") ?? data?.[0];
  return primary?.business_id ?? null;
}

/* ---- schema ---- */

const departureTimeRow = z.object({
  id: z.string().uuid().optional(), // absent = new row
  label: z.string().max(40).optional().nullable(),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/), // "07:00" or "07:00:00"
  days_of_week: z.array(z.number().int().min(0).max(6)), // 0=Sun..6=Sat
  is_active: z.boolean().default(true),
  sort_order: z.number().int().min(0).default(0),
});

const upsertInput = z.object({
  service_id: z.string().uuid(),
  rows: z.array(departureTimeRow),
});

/* ---- LIST ---- */

export const listDepartureTimes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { service_id: string }) => z.object({ service_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const businessId = await pickBusinessId(context.supabase, context.userId);
    if (!businessId) return { businessId: null, rows: [] };

    const { data: rows, error } = await context.supabase
      .from("service_departure_times")
      .select("id,label,start_time,days_of_week,is_active,sort_order")
      .eq("service_id", data.service_id)
      .eq("business_id", businessId)
      .order("sort_order", { ascending: true });

    if (error) throw new Response(error.message, { status: 500 });
    return { businessId, rows: rows ?? [] };
  });

/* ---- UPSERT (replace) ---- */

export const upsertDepartureTimes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => upsertInput.parse(i))
  .handler(async ({ data, context }) => {
    const businessId = await pickBusinessId(context.supabase, context.userId);
    if (!businessId) throw new Response("No business found", { status: 400 });

    const { service_id, rows } = data;

    // Verify the service belongs to this business.
    const { data: svc, error: svcErr } = await context.supabase
      .from("bookable_services")
      .select("id")
      .eq("id", service_id)
      .eq("business_id", businessId)
      .single();
    if (svcErr || !svc) throw new Response("Service not found", { status: 404 });

    // Delete ALL existing departure times for this service, then re-insert.
    // This is a full-replace strategy (simple, avoids row-level diffing).
    const { error: delErr } = await context.supabase
      .from("service_departure_times")
      .delete()
      .eq("service_id", service_id)
      .eq("business_id", businessId);
    if (delErr) throw new Response(delErr.message, { status: 400 });

    if (rows.length === 0) return { ok: true, count: 0 };

    const insertRows = rows.map((r, i) => ({
      service_id,
      business_id: businessId,
      label: r.label || null,
      start_time: r.start_time,
      days_of_week: r.days_of_week,
      is_active: r.is_active,
      sort_order: r.sort_order || i,
    }));

    const { error: insErr } = await context.supabase
      .from("service_departure_times")
      .insert(insertRows);
    if (insErr) throw new Response(insErr.message, { status: 400 });

    return { ok: true, count: insertRows.length };
  });

/* ---- DELETE one ---- */

export const deleteDepartureTime = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const businessId = await pickBusinessId(context.supabase, context.userId);
    if (!businessId) throw new Response("No business", { status: 400 });

    const { error } = await context.supabase
      .from("service_departure_times")
      .delete()
      .eq("id", data.id)
      .eq("business_id", businessId);
    if (error) throw new Response(error.message, { status: 400 });
    return { ok: true };
  });