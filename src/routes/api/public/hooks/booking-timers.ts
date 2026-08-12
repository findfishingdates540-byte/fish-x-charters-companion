/**
 * Booking lifecycle timers — invoked every 5 minutes by pg_cron.
 *
 * Spec §1.5: timers must survive restarts, so they live as scheduled jobs
 * hitting this route rather than in-process timers.
 *   - hold TTL       → pending_payment past hold_expires_at becomes expired
 *   - accept window  → pending_confirmation past deadline auto-declines
 *   - trip lifecycle → confirmed becomes in_progress on the trip date, and
 *                      in_progress becomes completed after the grace window
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/booking-timers")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const holds = await supabaseAdmin.rpc("expire_stale_holds", { _limit: 200 });
        if (holds.error) {
          return Response.json({ ok: false, step: "holds", error: holds.error.message }, { status: 500 });
        }

        const declines = await supabaseAdmin.rpc("auto_decline_expired_requests", { _limit: 200 });
        if (declines.error) {
          return Response.json(
            { ok: false, step: "accept_window", error: declines.error.message },
            { status: 500 },
          );
        }

        const lifecycle = await supabaseAdmin.rpc("advance_trip_lifecycle", {
          _grace_hours: 24,
          _limit: 200,
        });
        if (lifecycle.error) {
          return Response.json(
            { ok: false, step: "lifecycle", error: lifecycle.error.message },
            { status: 500 },
          );
        }

        return Response.json({
          ok: true,
          expiredHolds: holds.data ?? 0,
          autoDeclined: declines.data ?? 0,
          lifecycle: lifecycle.data ?? {},
        });
      },
    },
  },
});
