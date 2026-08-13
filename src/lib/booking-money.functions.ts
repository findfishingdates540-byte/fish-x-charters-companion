/**
 * Post-booking money operations for operators:
 * - collecting the on-the-day balance (the 75% Fish-X never touches)
 * - refunding the online deposit (partial or full) through Stripe
 *
 * Authorization runs through the caller's RLS-scoped client first; only then
 * do we load the admin client for the ledger writes.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BALANCE_METHODS = ["cash", "card_in_person", "bank_transfer", "other"] as const;

type BookingMoneyRow = {
  id: string;
  status: string;
  captain_id: string;
  total_cents: number;
  deposit_cents: number;
  balance_due_cents: number;
  balance_collected_at: string | null;
  refunded_cents: number;
  escrow_state: string;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  payout_released_at: string | null;
};

const SELECT =
  "id,status,captain_id,total_cents,deposit_cents,balance_due_cents,balance_collected_at,refunded_cents,escrow_state,stripe_payment_intent_id,stripe_charge_id,payout_released_at";

async function loadOwnedBooking(
  supabase: any,
  bookingId: string,
): Promise<BookingMoneyRow> {
  // RLS already limits operators to their own bookings.
  const { data, error } = await supabase
    .from("bookings")
    .select(SELECT)
    .eq("id", bookingId)
    .maybeSingle();
  if (error) throw new Response(error.message, { status: 500 });
  if (!data) throw new Response("Booking not found", { status: 404 });
  return data as BookingMoneyRow;
}

/** Captain records that the remaining balance was collected in person. */
export const markBalanceCollected = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        bookingId: z.string().uuid(),
        method: z.enum(BALANCE_METHODS).default("cash"),
        amountCents: z.number().int().min(0).optional(),
        note: z.string().max(300).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const booking = await loadOwnedBooking(context.supabase, data.bookingId);
    if (booking.balance_collected_at) {
      return { ok: true as const, alreadyCollected: true, collectedAt: booking.balance_collected_at };
    }
    const expected = booking.balance_due_cents || Math.max(0, booking.total_cents - booking.deposit_cents);
    const amount = data.amountCents ?? expected;

    const now = new Date().toISOString();
    const { error } = await context.supabase
      .from("bookings")
      .update({ balance_collected_at: now, balance_due_cents: Math.max(0, expected - amount), updated_at: now })
      .eq("id", booking.id);
    if (error) throw new Response(error.message, { status: 400 });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("domain_events").insert({
      topic: "booking.balance_collected",
      aggregate_type: "booking",
      aggregate_id: booking.id,
      payload: {
        booking_id: booking.id,
        amount_cents: amount,
        method: data.method,
        note: data.note ?? null,
        collected_by: context.userId,
      },
    });

    return {
      ok: true as const,
      alreadyCollected: false,
      collectedAt: now,
      amountCents: amount,
      remainingCents: Math.max(0, expected - amount),
    };
  });

/** Refunds part or all of the online deposit back to the guest. */
export const refundBookingDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        bookingId: z.string().uuid(),
        amountCents: z.number().int().positive().optional(),
        reason: z.string().max(300).optional(),
        policy: z.string().max(60).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const booking = await loadOwnedBooking(context.supabase, data.bookingId);
    const paid = booking.deposit_cents || booking.total_cents;
    const refundable = Math.max(0, paid - (booking.refunded_cents ?? 0));
    if (refundable === 0) throw new Response("Nothing left to refund on this booking.", { status: 400 });
    if (booking.payout_released_at) {
      throw new Response(
        "This payout has already been released — open a resolution case instead of a direct refund.",
        { status: 400 },
      );
    }

    const amount = Math.min(data.amountCents ?? refundable, refundable);
    const paymentIntentId = booking.stripe_payment_intent_id;
    if (!paymentIntentId && !booking.stripe_charge_id) {
      throw new Response("No online payment is attached to this booking.", { status: 400 });
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: ledger, error: ledgerErr } = await supabaseAdmin
      .from("refunds")
      .insert({
        booking_id: booking.id,
        amount_cents: amount,
        reason: data.reason ?? null,
        policy_applied: data.policy ?? null,
        created_by: context.userId,
        status: "pending",
      })
      .select("id")
      .single();
    if (ledgerErr) throw new Response(ledgerErr.message, { status: 500 });

    const { requireStripe } = await import("./stripe.server");
    const stripe = requireStripe();

    try {
      const refund = await stripe.refunds.create(
        {
          ...(paymentIntentId
            ? { payment_intent: paymentIntentId }
            : { charge: booking.stripe_charge_id! }),
          amount,
          metadata: { booking_id: booking.id, refund_id: ledger.id },
        },
        { idempotencyKey: `refund_${ledger.id}` },
      );

      const totalRefunded = (booking.refunded_cents ?? 0) + amount;
      const fullyRefunded = totalRefunded >= paid;

      await supabaseAdmin
        .from("refunds")
        .update({
          stripe_refund_id: refund.id,
          status: refund.status ?? "succeeded",
          succeeded_at: refund.status === "succeeded" ? new Date().toISOString() : null,
        })
        .eq("id", ledger.id);

      await supabaseAdmin
        .from("bookings")
        .update({
          refunded_cents: totalRefunded,
          escrow_state: fullyRefunded ? "refunded" : "partially_refunded",
          updated_at: new Date().toISOString(),
        })
        .eq("id", booking.id);

      await supabaseAdmin.from("domain_events").insert({
        topic: fullyRefunded ? "booking.refunded" : "booking.partially_refunded",
        aggregate_type: "booking",
        aggregate_id: booking.id,
        payload: {
          booking_id: booking.id,
          amount_cents: amount,
          total_refunded_cents: totalRefunded,
          reason: data.reason ?? null,
          refunded_by: context.userId,
        },
      });

      return {
        ok: true as const,
        refundId: ledger.id,
        amountCents: amount,
        totalRefundedCents: totalRefunded,
        fullyRefunded,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await supabaseAdmin
        .from("refunds")
        .update({ status: "failed", failure_message: message.slice(0, 500) })
        .eq("id", ledger.id);
      console.error("[stripe] refund failed", message);
      throw new Response(`Refund failed: ${message}`, { status: 400 });
    }
  });
