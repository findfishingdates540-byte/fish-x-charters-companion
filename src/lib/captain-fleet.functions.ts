/**
 * Fleet / Boat server functions for the captain dashboard.
 * Business-scoped CRUD for boats (specs + multi-image gallery).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

async function pickBusinessId(supabase: any, userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("business_members")
    .select("role,business_id,business:businesses(category_key)")
    .eq("user_id", userId);
  if (error) throw new Response(error.message, { status: 500 });
  const mems = data ?? [];
  // Captains always operate their charter business, even if they own others.
  const charter = mems.find((m: any) => (m.business?.category_key ?? "charter") === "charter");
  const primary = charter ?? mems.find((m: any) => m.role === "owner") ?? mems[0];
  return primary?.business_id ?? null;
}


/* ---------------- SCHEMAS ---------------- */

const boatInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(80),
  make: z.string().max(80).optional().nullable(),
  model: z.string().max(80).optional().nullable(),
  length_ft: z.number().int().min(1).max(200).optional().nullable(),
  capacity: z.number().int().min(1).max(50).optional().nullable(),
  home_port: z.string().max(120).optional().nullable(),
  description: z.string().max(4000).optional().nullable(),
  hero_image_url: z.string().max(2000).optional().nullable(), // relative /api/public/media/... path or external URL
  image_urls: z.array(z.string().max(2000)).default([]), // gallery images (relative paths or external URLs)
  is_active: z.boolean().default(true),
});

/* ---------------- LIST ---------------- */

export const listCaptainBoats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const businessId = await pickBusinessId(context.supabase, context.userId);
    if (!businessId) return { businessId: null, rows: [] };

    const { data: rows, error } = await context.supabase
      .from("boats")
      .select("id,name,make,model,length_ft,capacity,home_port,description,hero_image_url,image_urls,is_active,created_at")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });

    if (error) throw new Response(error.message, { status: 500 });
    const { signRowMedia } = await import("./media-urls.server");
    // Use the captain's authenticated Storage session. It is the same access
    // path used by uploads and does not depend on a service-role binding.
    return { businessId, rows: await signRowMedia((rows ?? []) as any[], context.supabase as any) };
  });

/* ---------------- UPSERT ---------------- */

export const upsertCaptainBoat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => boatInput.parse(i))
  .handler(async ({ data, context }) => {
    const businessId = await pickBusinessId(context.supabase, context.userId);
    if (!businessId) throw new Response("No business found", { status: 400 });

    const payload = {
      ...data,
      capacity: data.capacity ?? undefined,
      business_id: businessId,
      captain_id: context.userId, // legacy column for back-compat
    };

    const { data: row, error } = data.id
      ? await context.supabase.from("boats").update(payload).eq("id", data.id).eq("business_id", businessId).select().single()
      : await context.supabase.from("boats").insert(payload).select().single();

    if (error) throw new Response(error.message, { status: 400 });
    return row;
  });

/* ---------------- DELETE ---------------- */

export const deleteCaptainBoat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const businessId = await pickBusinessId(context.supabase, context.userId);
    if (!businessId) throw new Response("No business", { status: 400 });

    const { error } = await context.supabase.from("boats").delete().eq("id", data.id).eq("business_id", businessId);
    if (error) throw new Response(error.message, { status: 400 });
    return { ok: true };
  });