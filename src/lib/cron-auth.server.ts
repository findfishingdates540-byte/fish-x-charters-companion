/**
 * Shared-secret guard for the /api/public/hooks/* scheduler routes.
 *
 * These routes run privileged service-role work (payout release, booking
 * lifecycle timers, outbox dispatch) and must only ever be triggered by the
 * pg_cron scheduler. The scheduler sends `x-cron-secret`, read from the
 * private.cron_config table; this compares it against the CRON_SECRET
 * environment value in constant time.
 */
import { timingSafeEqual } from "crypto";

export function assertCronCaller(request: Request): Response | null {
  const expected = process.env["CRON_SECRET"];
  if (!expected) {
    return Response.json({ ok: false, error: "Scheduler not configured" }, { status: 503 });
  }
  const provided =
    request.headers.get("x-cron-secret") ?? request.headers.get("X-Cron-Secret") ?? "";

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  const ok = a.length === b.length && timingSafeEqual(a, b);
  if (!ok) return new Response("Forbidden", { status: 403 });
  return null;
}
