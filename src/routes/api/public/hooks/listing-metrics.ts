/**
 * Nightly ranking job — recomputes `listing_metrics` from bookings, reviews,
 * impressions and availability so `rank_listings` scores stay fresh.
 * Invoked by pg_cron with the shared cron secret.
 */
import { createFileRoute } from "@tanstack/react-router";
import { assertCronCaller } from "@/lib/cron-auth.server";

export const Route = createFileRoute("/api/public/hooks/listing-metrics")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = assertCronCaller(request);
        if (denied) return denied;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.rpc("recompute_listing_metrics");
        if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
        return Response.json({ ok: true, listings: data ?? 0 });
      },
    },
  },
});
