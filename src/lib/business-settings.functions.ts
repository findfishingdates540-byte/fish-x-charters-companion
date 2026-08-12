/**
 * Shared operator settings server functions — used by every business vertical
 * (charter, guide, marina/lodge, tackle/bait/gear/apparel).
 *
 * All calls run as the signed-in user through requireSupabaseAuth, so RLS on
 * business_members / businesses decides what can be read or written.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertMember(
  supabase: any,
  userId: string,
  businessId: string,
  roles: string[] = ["owner", "manager"],
) {
  const { data, error } = await supabase
    .from("business_members")
    .select("role")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Response(error.message, { status: 500 });
  if (!data || !roles.includes(data.role))
    throw new Response("You don't have permission to manage this business", { status: 403 });
  return data.role as string;
}

/** Business profile + team + the caller's role, for the Settings screen. */
export const getBusinessSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { businessId: string }) => z.object({ businessId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const myRole = await assertMember(supabase, userId, data.businessId, ["owner", "manager", "staff"]);

    const [bizRes, memRes, catRes] = await Promise.all([
      supabase.from("businesses").select("*").eq("id", data.businessId).maybeSingle(),
      supabase
        .from("business_members")
        .select("id,user_id,role,created_at")
        .eq("business_id", data.businessId)
        .order("created_at", { ascending: true }),
      supabase.from("business_categories").select("key,label,sort_order").order("sort_order"),
    ]);
    if (bizRes.error) throw new Response(bizRes.error.message, { status: 500 });
    if (!bizRes.data) throw new Response("Business not found", { status: 404 });

    const memberIds = (memRes.data ?? []).map((m: any) => m.user_id);
    let profiles: any[] = [];
    if (memberIds.length) {
      const p = await supabase
        .from("profiles")
        .select("id,full_name,display_name,avatar_url")
        .in("id", memberIds);
      profiles = p.data ?? [];
    }
    const team = (memRes.data ?? []).map((m: any) => ({
      ...m,
      profile: profiles.find((p) => p.id === m.user_id) ?? null,
      isMe: m.user_id === userId,
    }));

    return {
      business: bizRes.data,
      team,
      myRole,
      categories: catRes.data ?? [],
      viewerId: userId,
    };
  });

const nullable = (v: string | null | undefined) => {
  const t = (v ?? "").trim();
  return t.length ? t : null;
};

const profileInput = z.object({
  businessId: z.string().uuid(),
  name: z.string().min(2).max(80),
  tagline: z.string().max(160).optional().nullable(),
  description: z.string().max(6000).optional().nullable(),
  hero_url: z.string().max(2000).optional().nullable(),
  logo_url: z.string().max(2000).optional().nullable(),
  website: z.string().max(300).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  email: z.string().max(200).optional().nullable(),
  address: z.string().max(300).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  region: z.string().max(120).optional().nullable(),
  country: z.string().max(120).optional().nullable(),
  hours: z.record(z.string(), z.string()).optional(),
  amenities: z.array(z.string()).optional(),
});

/** Update the public-facing business profile. Owners and managers only. */
export const updateBusinessProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => profileInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertMember(supabase, userId, data.businessId);

    const patch: any = {
      name: data.name.trim(),
      tagline: nullable(data.tagline),
      description: nullable(data.description),
      hero_url: nullable(data.hero_url),
      logo_url: nullable(data.logo_url),
      website: nullable(data.website),
      phone: nullable(data.phone),
      email: nullable(data.email),
      address: nullable(data.address),
      city: nullable(data.city),
      region: nullable(data.region),
      country: nullable(data.country),
      updated_at: new Date().toISOString(),
    };
    if (data.hours) patch.hours_json = data.hours;
    if (data.amenities) patch.amenities_json = { list: data.amenities };

    const { data: row, error } = await supabase
      .from("businesses")
      .update(patch)
      .eq("id", data.businessId)
      .select()
      .single();
    if (error) throw new Response(error.message, { status: 400 });
    return row;
  });

/** Publish / unpublish the storefront. */
export const setBusinessPublished = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ businessId: z.string().uuid(), isPublished: z.boolean() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertMember(context.supabase, context.userId, data.businessId);
    const { error } = await context.supabase
      .from("businesses")
      .update({ is_published: data.isPublished })
      .eq("id", data.businessId);
    if (error) throw new Response(error.message, { status: 400 });
    return { ok: true as const };
  });

/** Change a teammate's role. Owners only. */
export const updateTeamMemberRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        businessId: z.string().uuid(),
        memberId: z.string().uuid(),
        role: z.enum(["owner", "manager", "staff"]),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertMember(context.supabase, context.userId, data.businessId, ["owner"]);
    const { error } = await context.supabase
      .from("business_members")
      .update({ role: data.role })
      .eq("id", data.memberId)
      .eq("business_id", data.businessId);
    if (error) throw new Response(error.message, { status: 400 });
    return { ok: true as const };
  });

/** Remove a teammate. Owners only; cannot remove yourself. */
export const removeTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ businessId: z.string().uuid(), memberId: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertMember(context.supabase, context.userId, data.businessId, ["owner"]);
    const { data: row } = await context.supabase
      .from("business_members")
      .select("user_id")
      .eq("id", data.memberId)
      .maybeSingle();
    if (row?.user_id === context.userId)
      throw new Response("You can't remove yourself from your own business", { status: 400 });
    const { error } = await context.supabase
      .from("business_members")
      .delete()
      .eq("id", data.memberId)
      .eq("business_id", data.businessId);
    if (error) throw new Response(error.message, { status: 400 });
    return { ok: true as const };
  });
