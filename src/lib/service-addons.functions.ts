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
};

export const listServiceAddons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ serviceId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await (context.supabase as any)
      .from("service_addons")
      .select("id,service_id,title,description,price_cents,unit,sort_order,is_active")
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
