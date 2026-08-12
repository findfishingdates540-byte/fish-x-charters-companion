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

        // Captain's share of the deposit releases 72h after the trip; vendor
        // merch payouts release 72h after the order is marked delivered.
        const tripPayouts = await supabaseAdmin.rpc("release_due_booking_payouts", { _limit: 200 });
        const orderPayouts = await supabaseAdmin.rpc("release_delivered_product_payouts", {
          _limit: 200,
        });

        return Response.json({
          ok: true,
          expiredHolds: holds.data ?? 0,
          autoDeclined: declines.data ?? 0,
          lifecycle: lifecycle.data ?? {},
          tripPayoutsReleased: tripPayouts.data ?? 0,
          orderPayoutsReleased: orderPayouts.data ?? 0,
          payoutErrors: [tripPayouts.error?.message, orderPayouts.error?.message].filter(Boolean),
        });

      },
    },
  },
});
