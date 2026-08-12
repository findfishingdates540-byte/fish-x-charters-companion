/**
 * Shared settlement logic for a booking whose payment just landed.
 *
 * Instant-book listings go straight to `confirmed`; request-to-book listings
 * park in `pending_confirmation` with the money authorised/held until the
 * operator accepts (or the accept-window timer auto-declines).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

type Admin = SupabaseClient<any, "public", any>;

export async function emitEvent(
  admin: Admin,
  topic: string,
  bookingId: string,
  payload: Record<string, unknown> = {},
) {
  await admin.from("domain_events").insert({
    topic,
    aggregate_type: "booking",
    aggregate_id: bookingId,
    payload: { booking_id: bookingId, ...payload },
  });
}

export async function settlePaidBooking(
  admin: Admin,
  bookingId: string,
  opts: { paymentIntentId?: string | null; chargeId?: string | null } = {},
) {
  const { data: booking } = await admin
    .from("bookings")
    .select("id,status,instant_book,accept_deadline_at,service_id")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) return { ok: false as const, reason: "booking_not_found" };
  if (["confirmed", "in_progress", "completed", "reviewed"].includes(booking.status)) {
    return { ok: true as const, status: booking.status, alreadySettled: true };
  }

  const instant = booking.instant_book !== false;
  const next = instant ? "confirmed" : "pending_confirmation";

  const patch: Record<string, unknown> = {
    status: next,
    escrow_state: "held",
    updated_at: new Date().toISOString(),
  };
  if (opts.paymentIntentId) patch["stripe_payment_intent_id"] = opts.paymentIntentId;
  if (opts.chargeId) patch["stripe_charge_id"] = opts.chargeId;
  if (!instant && !booking.accept_deadline_at) {
    patch["accept_deadline_at"] = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
  }

  const { error } = await admin.from("bookings").update(patch).eq("id", bookingId);
  if (error) return { ok: false as const, reason: error.message };

  await admin.from("booking_transitions").insert({
    booking_id: bookingId,
    from_status: booking.status,
    to_status: next,
    actor_kind: "system",
    reason: "payment_captured",
  });

  await emitEvent(admin, `booking.${next}`, bookingId, { instant_book: instant });

  return { ok: true as const, status: next, alreadySettled: false };
}
