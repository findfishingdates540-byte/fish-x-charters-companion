/**
 * Stripe webhook (platform + Connect events).
 *
 * Verified with STRIPE_WEBHOOK_SECRET before anything is written.
 * Handles:
 *  - payment_intent.succeeded  -> booking becomes confirmed, escrow held
 *  - payment_intent.payment_failed -> booking left pending_payment
 *  - charge.refunded           -> refunded amount tracked
 *  - charge.dispute.created    -> escrow frozen (payout blocked)
 *  - account.updated           -> Connect capability flags synced
 */
import { createFileRoute } from "@tanstack/react-router";
import type Stripe from "stripe";

export const Route = createFileRoute("/api/public/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["STRIPE_WEBHOOK_SECRET"];
        const signature = request.headers.get("stripe-signature");
        const body = await request.text();

        if (!secret || !signature) {
          return new Response("Webhook not configured", { status: 503 });
        }

        const { getStripe } = await import("@/lib/stripe.server");
        const stripe = getStripe();
        if (!stripe) return new Response("Stripe not configured", { status: 503 });

        let event: Stripe.Event;
        try {
          event = await stripe.webhooks.constructEventAsync(body, signature, secret);
        } catch (err) {
          console.error("[stripe] signature verification failed", err);
          return new Response("Invalid signature", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Idempotency: ignore events we've already stored.
        const { data: seen } = await supabaseAdmin
          .from("payment_events")
          .select("id")
          .eq("stripe_event_id", event.id)
          .maybeSingle();
        if (seen) return Response.json({ received: true, duplicate: true });

        const bookingIdOf = (obj: { metadata?: Stripe.Metadata | null }) =>
          (obj.metadata?.["booking_id"] as string | undefined) ?? null;

        let bookingId: string | null = null;

        try {
          switch (event.type) {
            case "payment_intent.succeeded": {
              const pi = event.data.object as Stripe.PaymentIntent;
              bookingId = bookingIdOf(pi);
              if (bookingId) {
                await supabaseAdmin
                  .from("bookings")
                  .update({
                    status: "confirmed",
                    escrow_state: "held",
                    stripe_payment_intent_id: pi.id,
                    stripe_charge_id: (pi.latest_charge as string | null) ?? null,
                  })
                  .eq("id", bookingId);
              }
              break;
            }
            case "payment_intent.payment_failed": {
              const pi = event.data.object as Stripe.PaymentIntent;
              bookingId = bookingIdOf(pi);
              if (bookingId) {
                await supabaseAdmin
                  .from("bookings")
                  .update({ status: "pending_payment", escrow_state: "none" })
                  .eq("id", bookingId);
              }
              break;
            }
            case "charge.refunded": {
              const charge = event.data.object as Stripe.Charge;
              bookingId = bookingIdOf(charge);
              if (bookingId) {
                await supabaseAdmin
                  .from("bookings")
                  .update({ refunded_cents: charge.amount_refunded, escrow_state: "refunded" })
                  .eq("id", bookingId);
              }
              break;
            }
            case "charge.dispute.created": {
              const dispute = event.data.object as Stripe.Dispute;
              const charge = typeof dispute.charge === "string" ? dispute.charge : dispute.charge.id;
              const { data: booking } = await supabaseAdmin
                .from("bookings")
                .select("id")
                .eq("stripe_charge_id", charge)
                .maybeSingle();
              bookingId = booking?.id ?? null;
              if (bookingId) {
                // Freeze the payout while the dispute is live.
                await supabaseAdmin
                  .from("bookings")
                  .update({ escrow_state: "frozen" })
                  .eq("id", bookingId);
              }
              break;
            }
            case "account.updated": {
              const account = event.data.object as Stripe.Account;
              await supabaseAdmin
                .from("businesses")
                .update({
                  charges_enabled: account.charges_enabled,
                  payouts_enabled: account.payouts_enabled,
                  ...(account.charges_enabled && account.payouts_enabled
                    ? { onboarding_completed_at: new Date().toISOString() }
                    : {}),
                })
                .eq("stripe_account_id", account.id);
              break;
            }
            default:
              break;
          }
        } catch (err) {
          console.error(`[stripe] handler failed for ${event.type}`, err);
          return new Response("Handler error", { status: 500 });
        }

        await supabaseAdmin.from("payment_events").insert({
          stripe_event_id: event.id,
          event_type: event.type,
          payload: event as unknown as Record<string, unknown>,
          booking_id: bookingId,
          processed_at: new Date().toISOString(),
        });

        return Response.json({ received: true });
      },
    },
  },
});
