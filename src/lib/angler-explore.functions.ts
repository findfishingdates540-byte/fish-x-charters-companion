/**
 * Server functions powering the angler "Explore" tab (cinematic charter discovery).
 * Runs as the signed-in angler via requireSupabaseAuth (RLS applies).
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type PostMedia = { url?: string; type?: string };

export const getAnglerExplore = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Where is the angler? Derive from their most recent booking's business city.
    const lastBooking = await supabase
      .from("bookings")
      .select("business:businesses(city,region)")
      .eq("angler_id", userId)
      .order("trip_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    const city = lastBooking.data?.business?.city ?? null;
    const region = lastBooking.data?.business?.region ?? null;

    const featuredRes = await supabase
      .from("bookable_services")
      .select(
        "id,slug,title,hero_url,base_price_cents,departure_location,target_species,capacity,created_at,business:businesses(id,slug,name,city,region,verified_at)",
      )
      .eq("is_published", true)
      .in("kind", ["charter_trip", "guided_trip"])
      .order("created_at", { ascending: false })
      .limit(12);
    if (featuredRes.error) throw new Response(featuredRes.error.message, { status: 500 });

    let all = featuredRes.data ?? [];

    // Ranking (deep spec Part 3): order by the weighted-sum scorer so quality,
    // reliability, conversion and freshness decide placement — not recency.
    const ranked = await supabase.rpc("rank_listings", {
      _city: city ?? undefined,
      _kinds: ["charter_trip", "guided_trip"],
      _limit: 100,
    });
    if (!ranked.error && ranked.data) {
      const scores = new Map<string, number>(
        ranked.data.map((r) => [r.service_id as string, Number(r.score)]),
      );
      all = [...all].sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0));
    }

    const featured = all.slice(0, 6);

    // "Near you": same city when we know it, otherwise the freshest listings.
    const nearby = (city ? all.filter((s) => s.business?.city === city) : []).concat(
      city ? [] : all,
    );

    // Ratings — aggregate reviews in JS (small volume, no view needed).
    const reviewsRes = await supabase.from("reviews").select("business_id,rating");
    const ratings = new Map<string, { sum: number; count: number }>();
    for (const r of reviewsRes.data ?? []) {
      const cur = ratings.get(r.business_id) ?? { sum: 0, count: 0 };
      cur.sum += r.rating;
      cur.count += 1;
      ratings.set(r.business_id, cur);
    }

    const bizRes = await supabase
      .from("businesses")
      .select("id,slug,name,tagline,city,region,logo_url,hero_url,verified_at")
      .eq("is_published", true)
      .in("category_key", ["charter", "guide_service"]);
    const businesses = bizRes.data ?? [];

    const topCaptains = businesses
      .map((b) => {
        const r = ratings.get(b.id);
        return {
          ...b,
          avg_rating: r ? Math.round((r.sum / r.count) * 10) / 10 : null,
          review_count: r?.count ?? 0,
        };
      })
      .sort(
        (a, b) =>
          (b.avg_rating ?? 0) - (a.avg_rating ?? 0) || b.review_count - a.review_count,
      )
      .slice(0, 3);

    // Catch highlights — images posted by operators.
    const postsRes = await supabase
      .from("business_posts")
      .select("id,body,media_json,created_at,business:businesses(id,slug,name)")
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .limit(30);

    const highlights: { id: string; url: string; businessSlug: string | null; caption: string }[] = [];
    for (const p of postsRes.data ?? []) {
      const media = Array.isArray(p.media_json) ? (p.media_json as PostMedia[]) : [];
      for (const m of media) {
        if (m && typeof m.url === "string" && m.url) {
          highlights.push({
            id: `${p.id}-${highlights.length}`,
            url: m.url,
            businessSlug: p.business?.slug ?? null,
            caption: p.body?.slice(0, 80) ?? "",
          });
        }
      }
    }

    return {
      city,
      region,
      featured,
      nearby: nearby.slice(0, 8),
      topCaptains,
      highlights: highlights.slice(0, 12),
      ratings: Object.fromEntries(
        [...ratings.entries()].map(([id, r]) => [
          id,
          { avg: Math.round((r.sum / r.count) * 10) / 10, count: r.count },
        ]),
      ) as Record<string, { avg: number; count: number }>,
    };
  });
