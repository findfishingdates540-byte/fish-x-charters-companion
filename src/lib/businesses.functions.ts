/**
 * Public business directory read functions.
 * Uses a server-local publishable-key client so anon SELECT policies apply.
 */
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

export const listPublicBusinesses = createServerFn({ method: "GET" })
  .inputValidator((input: { category?: string } | undefined) =>
    z.object({ category: z.string().optional() }).parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const sb = publicClient();
    let q = sb
      .from("businesses")
      .select("id,slug,name,category_key,tagline,hero_url,logo_url,city,region,country,verified_at,premium_until")
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(60);
    if (data.category) q = q.eq("category_key", data.category);
    const { data: rows, error } = await q;
    if (error) throw new Response(error.message, { status: 500 });
    return rows ?? [];
  });

export const listCategories = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data, error } = await sb
    .from("business_categories")
    .select("key,label,icon,sort_order")
    .order("sort_order");
  if (error) throw new Response(error.message, { status: 500 });
  return data ?? [];
});

export const getBusinessBySlug = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) => z.object({ slug: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: biz, error } = await sb
      .from("businesses")
      .select(
        "id,slug,name,category_key,tagline,description,hero_url,logo_url,website,phone,email,address,city,region,country,lat,lng,hours_json,amenities_json,verified_at,premium_until",
      )
      .eq("slug", data.slug)
      .eq("is_published", true)
      .maybeSingle();
    if (error) throw new Response(error.message, { status: 500 });
    if (!biz) throw new Response("Not found", { status: 404 });
    return biz;
  });
