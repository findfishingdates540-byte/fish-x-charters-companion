/**
 * Authenticated business functions: my businesses, create business, etc.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyBusinesses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: mems, error } = await supabase
      .from("business_members")
      .select("role, business:businesses(id,slug,name,category_key,hero_url,is_published,verified_at)")
      .eq("user_id", userId);
    if (error) throw new Response(error.message, { status: 500 });
    return mems ?? [];
  });

const slugRe = /^[a-z0-9](?:[a-z0-9-]{1,60}[a-z0-9])?$/;

export const createBusiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        name: z.string().min(2).max(80),
        slug: z.string().regex(slugRe, "lowercase letters, numbers, hyphens"),
        categoryKey: z.string().min(2),
        tagline: z.string().max(160).optional(),
        city: z.string().max(80).optional(),
        region: z.string().max(80).optional(),
        country: z.string().max(80).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: business, error: bizErr } = await supabase
      .from("businesses")
      .insert({
        name: data.name,
        slug: data.slug,
        category_key: data.categoryKey,
        tagline: data.tagline,
        city: data.city,
        region: data.region,
        country: data.country,
        created_by: userId,
      })
      .select()
      .single();
    if (bizErr) throw new Response(bizErr.message, { status: 400 });

    const { error: memErr } = await supabase
      .from("business_members")
      .insert({ business_id: business.id, user_id: userId, role: "owner" });
    if (memErr) throw new Response(memErr.message, { status: 400 });

    return business;
  });
