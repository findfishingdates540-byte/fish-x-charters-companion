/**
 * Copies the CRON_SECRET server env value into private.cron_config so pg_cron
 * can send it as the x-cron-secret header. Guarded by the same secret, so only
 * a caller that already knows it (an operator or the scheduler) can run it.
 */
import { createFileRoute } from "@tanstack/react-router";
import { assertCronCaller } from "@/lib/cron-auth.server";

export const Route = createFileRoute("/api/public/hooks/sync-cron-secret")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = assertCronCaller(request);
        if (denied) return denied;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin.rpc("set_cron_secret" as never, {
          _value: process.env["CRON_SECRET"]!,
        } as never);
        if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
        return Response.json({ ok: true });
      },
    },
  },
});
