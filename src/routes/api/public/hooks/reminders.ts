/**
 * Reminder job — hourly. Emits idempotent domain events for:
 *   - confirmed trips starting in ~48h and ~24h
 *   - unread booking / business messages older than 24h
 * The outbox dispatcher turns these into in-app notifications and email.
 */
import { createFileRoute } from "@tanstack/react-router";
import { assertCronCaller } from "@/lib/cron-auth.server";

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

/** Emit once per (topic, aggregate) — reruns of the hourly job never duplicate. */
async function emitOnce(
  admin: Admin,
  topic: string,
  aggregateType: string,
  aggregateId: string,
  payload: Record<string, unknown>,
) {
  const { data: existing } = await admin
    .from("domain_events")
    .select("id")
    .eq("topic", topic)
    .eq("aggregate_id", aggregateId)
    .limit(1);
  if (existing && existing.length) return false;
  const { error } = await admin.rpc("emit_domain_event", {
    _topic: topic,
    _aggregate_type: aggregateType,
    _aggregate_id: aggregateId,
    _payload: payload as never,
  });
  return !error;
}

export const Route = createFileRoute("/api/public/hooks/reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = assertCronCaller(request);
        if (denied) return denied;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const admin = supabaseAdmin as Admin;

        const day = (offset: number) => {
          const d = new Date(Date.now() + offset * 86400_000);
          return d.toISOString().slice(0, 10);
        };

        let reminders = 0;
        for (const [offset, topic] of [
          [2, "booking.reminder_48h"],
          [1, "booking.reminder_24h"],
        ] as const) {
          const { data: rows } = await admin
            .from("bookings")
            .select("id")
            .eq("status", "confirmed")
            .eq("trip_date", day(offset))
            .limit(200);
          for (const b of rows ?? []) {
            if (await emitOnce(admin, topic, "booking", b.id, { booking_id: b.id })) reminders++;
          }
        }

        // Unread message nudges — one per recipient per day.
        const cutoff = new Date(Date.now() - 86400_000).toISOString();
        let nudges = 0;

        const { data: bookingMsgs } = await admin
          .from("booking_messages")
          .select("id,booking_id,sender_id,created_at,booking:bookings(angler_id,captain_id)")
          .is("read_at", null)
          .lte("created_at", cutoff)
          .limit(300);

        const perUser = new Map<string, { count: number; link: string }>();
        for (const m of bookingMsgs ?? []) {
          const b = m.booking as { angler_id: string | null; captain_id: string | null } | null;
          if (!b) continue;
          const recipient = m.sender_id === b.angler_id ? b.captain_id : b.angler_id;
          if (!recipient) continue;
          const entry = perUser.get(recipient) ?? { count: 0, link: "/messages" };
          entry.count++;
          perUser.set(recipient, entry);
        }

        const stamp = new Date().toISOString().slice(0, 10);
        for (const [userId, entry] of perUser) {
          const ok = await emitOnce(
            admin,
            "message.unread_nudge",
            "user",
            userId,
            { user_id: userId, count: entry.count, link: entry.link, day: stamp },
          );
          if (ok) nudges++;
        }

        return Response.json({ ok: true, reminders, nudges });
      },
    },
  },
});
