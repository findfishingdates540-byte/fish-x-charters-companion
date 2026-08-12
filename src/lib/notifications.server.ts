/**
 * Notification fan-out for domain events (server-only).
 *
 * The booking service never sends email or writes notifications inline — it
 * only emits `domain_events`. The outbox dispatcher calls `handleDomainEvent`
 * for each event, which resolves recipients, writes in-app notifications and
 * (optionally) queues an email. Every write is idempotent per
 * (dedupe_key, user_id, channel) so redelivery never double-notifies.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

type Admin = SupabaseClient<any, "public", any>;

export type DomainEvent = {
  id: string;
  topic: string;
  aggregate_type: string;
  aggregate_id: string | null;
  payload: Record<string, unknown>;
};

export type NotificationDraft = {
  userId: string;
  category: string;
  title: string;
  body?: string | null;
  link?: string | null;
  severity?: "info" | "success" | "warning" | "critical";
  meta?: Record<string, unknown>;
  /** Skip the email channel for chatty categories. */
  email?: boolean;
};

const APP_URL =
  process.env["PUBLIC_APP_URL"] ?? "https://fishx-charter-hub.lovable.app";

function money(cents?: number | null) {
  if (typeof cents !== "number") return "";
  return `$${Math.round(cents / 100).toLocaleString()}`;
}

/** Angler + every staff member of the operating business. */
async function bookingAudience(admin: Admin, bookingId: string) {
  const { data: booking } = await admin
    .from("bookings")
    .select(
      "id,angler_id,captain_id,business_id,trip_date,start_time,party_size,total_cents,payout_cents,accept_deadline_at,service:bookable_services(title),business:businesses(name)",
    )
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) return null;

  const operators = new Set<string>();
  if (booking.captain_id) operators.add(booking.captain_id);
  if (booking.business_id) {
    const { data: members } = await admin
      .from("business_members")
      .select("user_id")
      .eq("business_id", booking.business_id);
    for (const m of members ?? []) operators.add(m.user_id as string);
  }
  operators.delete(booking.angler_id as string);

  return {
    booking,
    anglerId: booking.angler_id as string | null,
    operatorIds: [...operators],
    tripLabel:
      (booking.service as { title?: string } | null)?.title ?? "your trip",
    businessName:
      (booking.business as { name?: string } | null)?.name ?? "the operator",
    dateLabel: booking.trip_date
      ? new Date(`${booking.trip_date}T00:00:00`).toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        })
      : "",
  };
}

/** Build the notification drafts for one domain event. */
export async function draftsForEvent(
  admin: Admin,
  evt: DomainEvent,
): Promise<NotificationDraft[]> {
  const topic = evt.topic;

  if (topic.startsWith("booking.") || topic.startsWith("payout.")) {
    const id = (evt.payload["booking_id"] as string) ?? evt.aggregate_id;
    if (!id) return [];
    const ctx = await bookingAudience(admin, id);
    if (!ctx) return [];

    const { booking, anglerId, operatorIds, tripLabel, businessName, dateLabel } = ctx;
    const anglerLink = `/trips/detail?booking=${booking.id}`;
    const opLink = `/bookings/detail?booking=${booking.id}`;
    const out: NotificationDraft[] = [];
    const push = (
      users: Array<string | null>,
      d: Omit<NotificationDraft, "userId">,
    ) => {
      for (const u of users) if (u) out.push({ userId: u, ...d });
    };

    switch (topic) {
      case "booking.created": {
        const instant = booking_instant(evt);
        push([anglerId], {
          category: "booking",
          title: instant ? "Booking started" : "Request sent to the captain",
          body: instant
            ? `Finish payment to lock in ${tripLabel} on ${dateLabel}.`
            : `${businessName} has 24 hours to accept ${tripLabel} on ${dateLabel}.`,
          link: anglerLink,
        });
        break;
      }
      case "booking.pending_confirmation":
        push(operatorIds, {
          category: "booking",
          title: "New booking request",
          body: `${tripLabel} on ${dateLabel} · ${booking.party_size} angler(s) · ${money(booking.total_cents)}. Accept within 24 hours or it auto-declines.`,
          link: opLink,
          severity: "warning",
        });
        break;
      case "booking.confirmed":
        push([anglerId], {
          category: "booking",
          title: "Your trip is confirmed",
          body: `${tripLabel} with ${businessName} on ${dateLabel}. Funds are held in escrow until 24h after the trip.`,
          link: anglerLink,
          severity: "success",
        });
        push(operatorIds, {
          category: "booking",
          title: "Trip confirmed",
          body: `${tripLabel} on ${dateLabel} · ${booking.party_size} angler(s).`,
          link: opLink,
          severity: "success",
        });
        break;
      case "booking.in_progress":
        push([anglerId, ...operatorIds], {
          category: "booking",
          title: "Trip day",
          body: `${tripLabel} is underway. Tight lines.`,
          link: anglerLink,
          email: false,
        });
        break;
      case "booking.completed":
        push([anglerId], {
          category: "review",
          title: "How was your trip?",
          body: `Leave a review for ${businessName} — it unlocks their payout and helps other anglers.`,
          link: `/review?booking=${booking.id}`,
        });
        push(operatorIds, {
          category: "payout",
          title: "Trip completed — payout pending",
          body: `${money(booking.payout_cents)} releases 24 hours after completion unless a dispute is opened.`,
          link: opLink,
        });
        break;
      case "booking.declined":
        push([anglerId], {
          category: "booking",
          title: "Booking declined",
          body: `${businessName} could not take ${tripLabel} on ${dateLabel}. Any authorised payment has been released.`,
          link: anglerLink,
          severity: "warning",
        });
        break;
      case "booking.expired":
        push([anglerId], {
          category: "booking",
          title: "Your hold expired",
          body: `The seats for ${tripLabel} on ${dateLabel} were released because checkout wasn't completed.`,
          link: anglerLink,
          severity: "warning",
        });
        break;
      case "booking.cancelled_angler":
      case "booking.cancelled_captain":
        push([anglerId, ...operatorIds], {
          category: "booking",
          title: "Booking cancelled",
          body: `${tripLabel} on ${dateLabel} was cancelled. Refunds follow the cancellation policy.`,
          link: anglerLink,
          severity: "warning",
        });
        break;
      case "booking.refunded":
        push([anglerId], {
          category: "payment",
          title: "Refund issued",
          body: `Your refund for ${tripLabel} is on its way back to your card.`,
          link: anglerLink,
          severity: "success",
        });
        break;
      case "booking.disputed":
        push([anglerId, ...operatorIds], {
          category: "dispute",
          title: "Resolution case opened",
          body: `Payout for ${tripLabel} is frozen while Fish-X reviews the case.`,
          link: "/resolution-center",
          severity: "critical",
        });
        break;
      case "payout.released":
        push(operatorIds, {
          category: "payout",
          title: "Payout released",
          body: `${money((evt.payload["amount_cents"] as number) ?? booking.payout_cents)} is on its way to your bank.`,
          link: "/payouts-status",
          severity: "success",
        });
        break;
      default:
        return [];
    }
    return out;
  }

  return [];
}

function booking_instant(evt: DomainEvent) {
  return evt.payload["instant_book"] !== false;
}

async function emailAllowed(admin: Admin, userId: string, category: string) {
  const { data } = await admin
    .from("notification_preferences")
    .select("email_enabled,categories")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return true;
  if (!data.email_enabled) return false;
  const cats = (data.categories ?? {}) as Record<string, boolean>;
  return cats[category] !== false;
}

async function recipientEmail(admin: Admin, userId: string) {
  const { data } = await admin.auth.admin.getUserById(userId);
  return data?.user?.email ?? null;
}

/**
 * Send one transactional email. Wired to Lovable Emails when the project has
 * an email domain configured; a no-op (reported as `skipped`) otherwise, so a
 * missing email setup can never fail a booking.
 */
async function sendEmail(to: string, draft: NotificationDraft) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  const from = process.env["EMAIL_FROM"];
  if (!apiKey || !from) return { sent: false, reason: "email_not_configured" };

  const res = await fetch("https://api.lovable.dev/emails/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: draft.title,
      html: emailHtml(draft),
    }),
  });
  if (!res.ok) {
    return { sent: false, reason: `${res.status}: ${(await res.text()).slice(0, 300)}` };
  }
  return { sent: true, reason: null as string | null };
}

function emailHtml(draft: NotificationDraft) {
  const link = draft.link ? `${APP_URL}${draft.link}` : APP_URL;
  return `<!doctype html><html><body style="margin:0;background:#ffffff;font-family:'Hanken Grotesk',system-ui,sans-serif;color:#0d2236">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px">
    <div style="font-family:Georgia,serif;font-size:20px;font-weight:700;letter-spacing:.02em">Fish-X Charters</div>
    <h1 style="font-family:Georgia,serif;font-size:26px;margin:24px 0 10px">${escapeHtml(draft.title)}</h1>
    <p style="font-size:15px;line-height:1.6;color:#5c6b78;margin:0 0 24px">${escapeHtml(draft.body ?? "")}</p>
    <a href="${link}" style="display:inline-block;background:#0d2236;color:#ffffff;text-decoration:none;border-radius:10px;padding:13px 22px;font-size:14px;font-weight:700">Open Fish-X Charters</a>
    <p style="font-size:12px;color:#8a97a3;margin-top:32px">You're receiving this because of activity on your Fish-X Charters account. Manage notification settings in your account page.</p>
  </div></body></html>`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

/** Idempotently deliver every notification for one domain event. */
export async function handleDomainEvent(admin: Admin, evt: DomainEvent) {
  const drafts = await draftsForEvent(admin, evt);
  let created = 0;
  let emailed = 0;

  for (const draft of drafts) {
    const dedupe = `${evt.topic}:${evt.id}`;

    const claim = await admin
      .from("notification_deliveries")
      .insert({
        event_id: evt.id,
        dedupe_key: dedupe,
        user_id: draft.userId,
        channel: "in_app",
        status: "sent",
      })
      .select("id")
      .maybeSingle();
    // Unique violation => already delivered for this event/user; skip entirely.
    if (claim.error) continue;

    const ins = await admin.from("notifications").insert({
      user_id: draft.userId,
      category: draft.category,
      title: draft.title,
      body: draft.body ?? null,
      link: draft.link ?? null,
      severity: draft.severity ?? "info",
      meta: { ...(draft.meta ?? {}), topic: evt.topic, event_id: evt.id },
    });
    if (!ins.error) created += 1;

    if (draft.email === false) continue;
    if (!(await emailAllowed(admin, draft.userId, draft.category))) continue;

    const emailClaim = await admin
      .from("notification_deliveries")
      .insert({
        event_id: evt.id,
        dedupe_key: dedupe,
        user_id: draft.userId,
        channel: "email",
        status: "pending",
      })
      .select("id")
      .maybeSingle();
    if (emailClaim.error || !emailClaim.data) continue;

    const to = await recipientEmail(admin, draft.userId);
    if (!to) {
      await admin
        .from("notification_deliveries")
        .update({ status: "skipped", error: "no email on file" })
        .eq("id", emailClaim.data.id);
      continue;
    }
    const result = await sendEmail(to, draft);
    await admin
      .from("notification_deliveries")
      .update({
        status: result.sent ? "sent" : "skipped",
        error: result.reason,
      })
      .eq("id", emailClaim.data.id);
    if (result.sent) emailed += 1;
  }

  return { created, emailed };
}
