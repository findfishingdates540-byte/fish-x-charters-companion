/**
 * Inbound webhook from the Fish-X consumer app.
 * Public route — verifies HMAC signature before any DB writes.
 */
import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";

export const Route = createFileRoute("/api/public/fishx-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.FISHX_WEBHOOK_SECRET;
        if (!secret) return new Response("Not configured", { status: 503 });

        const signature = request.headers.get("x-fishx-signature") ?? "";
        const eventId = request.headers.get("x-fishx-event-id") ?? "";
        const body = await request.text();

        const expected = createHmac("sha256", secret).update(body).digest("hex");
        const sig = Buffer.from(signature);
        const exp = Buffer.from(expected);
        if (sig.length !== exp.length || !timingSafeEqual(sig, exp)) {
          return new Response("Invalid signature", { status: 401 });
        }

        let payload: { type?: string; data?: Record<string, unknown> };
        try {
          payload = JSON.parse(body);
        } catch {
          return new Response("Bad JSON", { status: 400 });
        }
        const eventType = payload.type ?? "unknown";

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Idempotency: log the event; skip if we've already seen it
        const { error: insertErr } = await supabaseAdmin
          .from("fishx_webhook_events")
          .insert({ event_id: eventId || `${eventType}-${Date.now()}`, event_type: eventType, payload });
        if (insertErr && !insertErr.message.includes("duplicate")) {
          return new Response(insertErr.message, { status: 500 });
        }
        if (insertErr) {
          // duplicate → already processed
          return new Response("ok", { status: 200 });
        }

        // Dispatch by event type
        try {
          if (eventType === "angler.linked" && payload.data) {
            const d = payload.data as { charters_user_id?: string; fishx_user_id?: string; scopes?: string[] };
            if (d.charters_user_id && d.fishx_user_id) {
              await supabaseAdmin.from("fishx_link").upsert({
                user_id: d.charters_user_id,
                fishx_user_id: d.fishx_user_id,
                scopes: d.scopes ?? [],
              });
            }
          }
          await supabaseAdmin
            .from("fishx_webhook_events")
            .update({ processed_at: new Date().toISOString() })
            .eq("event_id", eventId);
        } catch (e) {
          await supabaseAdmin
            .from("fishx_webhook_events")
            .update({ error: e instanceof Error ? e.message : String(e) })
            .eq("event_id", eventId);
          return new Response("Handler error", { status: 500 });
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
