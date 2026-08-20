/**
 * Copies the CRON_SECRET server env value into private.cron_config so the
 * pg_cron jobs can send it as the x-cron-secret header. Idempotent, returns
 * no secret material.
 */
import { createServerFn } from "@tanstack/react-start";

export const syncCronSecret = createServerFn({ method: "POST" }).handler(async () => {
  const value = process.env["CRON_SECRET"];
  if (!value) return { ok: false as const, reason: "missing_env" };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.rpc("set_cron_secret" as never, { _value: value } as never);
  if (error) return { ok: false as const, reason: error.message };
  return { ok: true as const };
});
