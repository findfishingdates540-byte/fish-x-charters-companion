/**
 * Server functions for the captain/operator dashboard.
 * Aggregates bookings, earnings, and services for the user's primary business.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

const UPCOMING: BookingStatus[] = [
  "pending_payment",
  "pending_confirmation",
  "confirmed",
  "in_progress",
];
const ESCROW: BookingStatus[] = ["confirmed", "in_progress"];
const EARNED: BookingStatus[] = ["completed", "reviewed"];

export const getCaptainDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Pick the user's primary business (owner/manager first).
    const { data: mems, error: memErr } = await supabase
      .from("business_members")
      .select("role, business:businesses(id,slug,name,category_key,hero_url,logo_url,city,region,verified_at,is_published)")
      .eq("user_id", userId);
    if (memErr) throw new Response(memErr.message, { status: 500 });

    const primary = (mems ?? []).find((m) => m.role === "owner") ?? mems?.[0];
    const business = primary?.business ?? null;

    if (!business) {
      return {
        business: null,
        profile: null,
        services: [],
        upcoming: [],
        recent: [],
        stats: { grossCents: 0, escrowCents: 0, upcomingCount: 0, completedCount: 0 },
      };
    }

    const today = new Date().toISOString().slice(0, 10);
    const monthStart = new Date();
    monthStart.setDate(1);
    const monthStartStr = monthStart.toISOString().slice(0, 10);

    const [profileRes, servicesRes, upcomingRes, recentRes, monthlyRes, escrowRes, completedRes] = await Promise.all([
      supabase.from("profiles").select("display_name,full_name,avatar_url").eq("id", userId).maybeSingle(),
      supabase
        .from("bookable_services")
        .select("id,slug,title,hero_url,base_price_cents,is_published,capacity")
        .eq("business_id", business.id)
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("bookings")
        .select("id,trip_date,start_time,status,total_cents,party_size,angler:profiles!bookings_angler_id_fkey(display_name,full_name,avatar_url),service:bookable_services(title,hero_url)")
        .eq("business_id", business.id)
        .in("status", UPCOMING)
        .gte("trip_date", today)
        .order("trip_date", { ascending: true })
        .limit(8),
      supabase
        .from("bookings")
        .select("id,trip_date,status,total_cents,angler:profiles!bookings_angler_id_fkey(display_name,full_name),service:bookable_services(title)")
        .eq("business_id", business.id)
        .order("updated_at", { ascending: false })
        .limit(6),
      supabase
        .from("bookings")
        .select("total_cents")
        .eq("business_id", business.id)
        .in("status", EARNED)
        .gte("trip_date", monthStartStr),
      supabase
        .from("bookings")
        .select("total_cents")
        .eq("business_id", business.id)
        .in("status", ESCROW),
      supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("business_id", business.id)
        .in("status", EARNED),
    ]);

    for (const r of [profileRes, servicesRes, upcomingRes, recentRes, monthlyRes, escrowRes, completedRes]) {
      if (r.error) throw new Response(r.error.message, { status: 500 });
    }

    const grossCents = (monthlyRes.data ?? []).reduce((s, b) => s + (b.total_cents ?? 0), 0);
    const escrowCents = (escrowRes.data ?? []).reduce((s, b) => s + (b.total_cents ?? 0), 0);

    return {
      business,
      profile: profileRes.data,
      services: servicesRes.data ?? [],
      upcoming: upcomingRes.data ?? [],
      recent: recentRes.data ?? [],
      stats: {
        grossCents,
        escrowCents,
        upcomingCount: (upcomingRes.data ?? []).length,
        completedCount: completedRes.count ?? 0,
      },
    };
  });
