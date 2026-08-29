/**
 * Operator CRUD for optional trip add-ons (fish cleaning, extra hour, gear…).
 * Scoped to a business the caller manages; RLS re-checks on every write.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ServiceAddon = {
  id: string;
  service_id: string;
  title: string;
  description: string | null;
  price_cents: number;
  unit: "per_trip" | "per_person";
  sort_order: number;
  is_active: boolean;
  /** Hard cap on units a single booking may take (null = unlimited). */
  max_per_booking: number | null;
  /** Units sellable across all bookings on one departure (null = unlimited). */
  capacity_per_slot: number | null;
  /** Must be booked at least this many hours before departure. */
  lead_time_hours: number;
};

export const listServiceAddons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ serviceId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await (context.supabase as any)
      .from("service_addons")
      .select("id,service_id,title,description,price_cents,unit,sort_order,is_active,max_per_booking,capacity_per_slot,lead_time_hours")
      .eq("service_id", data.serviceId)
      .order("sort_order", { ascending: true });
    if (error) throw new Response(error.message, { status: 500 });
    return (rows ?? []) as ServiceAddon[];
  });

const addonInput = z.object({
  businessId: z.string().uuid(),
  serviceId: z.string().uuid(),
  id: z.string().uuid().optional(),
  title: z.string().min(2).max(120),
  description: z.string().max(500).optional().nullable(),
  price_cents: z.number().int().min(0),
  unit: z.enum(["per_trip", "per_person"]),
  sort_order: z.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
  max_per_booking: z.number().int().min(1).max(999).nullable().default(null),
  capacity_per_slot: z.number().int().min(0).max(9999).nullable().default(null),
  lead_time_hours: z.number().int().min(0).max(720).default(0),
});

export const upsertServiceAddon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => addonInput.parse(i))
  .handler(async ({ data, context }) => {
    const { businessId, serviceId, id, ...rest } = data;
    const payload = { ...rest, business_id: businessId, service_id: serviceId };
    const q = (context.supabase as any).from("service_addons");
    const { data: row, error } = id
      ? await q.update(payload).eq("id", id).eq("business_id", businessId).select().single()
      : await q.insert(payload).select().single();
    if (error) throw new Response(error.message, { status: 400 });
    return row as ServiceAddon;
  });

export const deleteServiceAddon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ businessId: z.string().uuid(), id: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any)
      .from("service_addons")
      .delete()
      .eq("id", data.id)
      .eq("business_id", data.businessId);
    if (error) throw new Response(error.message, { status: 400 });
    return { ok: true as const };
  });

/**
 * Copy add-ons from one charter to another.
 * The captain uses this to "define once, reuse everywhere" — they build add-ons
 * on one trip, then clone them to other charters. No shared table, no RPC changes.
 * Each target service gets its own independent rows.
 */
const copyInput = z.object({
  businessId: z.string().uuid(),
  fromServiceId: z.string().uuid(),
  toServiceId: z.string().uuid(),
});

export const copyServiceAddons = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => copyInput.parse(i))
  .handler(async ({ data, context }) => {
    const { businessId, fromServiceId, toServiceId } = data;

    // Verify both services belong to this business.
    const { data: services, error: svcErr } = await (context.supabase as any)
      .from("bookable_services")
      .select("id")
      .eq("business_id", businessId)
      .in("id", [fromServiceId, toServiceId]);
    if (svcErr) throw new Response(svcErr.message, { status: 500 });
    if (!services || services.length !== 2) throw new Response("Service(s) not found", { status: 404 });

    // Fetch active add-ons from the source service.
    const { data: srcAddons, error: srcErr } = await (context.supabase as any)
      .from("service_addons")
      .select("id,title,description,price_cents,unit,sort_order,is_active,max_per_booking,capacity_per_slot,lead_time_hours")
      .eq("service_id", fromServiceId)
      .eq("business_id", businessId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (srcErr) throw new Response(srcErr.message, { status: 500 });

    if (!srcAddons?.length) return { copied: 0, ok: true };

    // Insert cloned rows for the target service.
    const cloned = srcAddons.map((a: any, idx: number) => ({
      business_id: businessId,
      service_id: toServiceId,
      title: a.title,
      description: a.description,
      price_cents: a.price_cents,
      unit: a.unit,
      sort_order: idx,
      is_active: true,
      max_per_booking: a.max_per_booking,
      capacity_per_slot: a.capacity_per_slot,
      lead_time_hours: a.lead_time_hours,
    }));

    const { error: insErr } = await (context.supabase as any)
      .from("service_addons")
      .insert(cloned);
    if (insErr) throw new Response(insErr.message, { status: 400 });

    return { copied: cloned.length, ok: true };
  });
