/**
 * Angler → My Trips. Returns the signed-in angler's bookings bucketed into
 * upcoming / past / cancelled. RLS applies via requireSupabaseAuth.
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
const PAST: BookingStatus[] = ["completed", "reviewed"];

const SELECT =
  "id,trip_date,start_time,status,total_cents,party_size,escrow_state," +
  "service:bookable_services(id,title,hero_url,departure_location)," +
  "business:businesses(id,slug,name,city,region,hero_url,logo_url)";


export const listAnglerTrips = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data, error } = await supabase
      .from("bookings")
      .select(SELECT)
      .eq("angler_id", userId)
      .order("trip_date", { ascending: false })
      .limit(120);

    if (error) throw new Response(error.message, { status: 500 });

    const rows = data ?? [];
    const upcoming = rows
      .filter((b) => UPCOMING.includes(b.status))
      .sort((a, b) => a.trip_date.localeCompare(b.trip_date));
    const past = rows.filter((b) => PAST.includes(b.status));
    const cancelled = rows.filter(
      (b) => !UPCOMING.includes(b.status) && !PAST.includes(b.status),
    );

    return { upcoming, past, cancelled };
  });
