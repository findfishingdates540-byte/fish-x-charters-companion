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

        const orderIdsOf = (obj: { metadata?: Stripe.Metadata | null }) => {
          if (obj.metadata?.["kind"] !== "product_order") return [];
          return (obj.metadata?.["order_ids"] ?? "").split(",").filter(Boolean);
        };

        /**
         * Marks vendor product orders paid, decrements stock and transfers the
         * vendor's 80% to their connected account. Retail has no dispute
         * window, so the transfer goes out as soon as the charge lands.
         */
        const settleProductOrders = async (
          orderIds: string[],
          paymentIntentId: string | null,
          chargeId: string | null,
        ) => {
          for (const orderId of orderIds) {
            const { data: order } = await supabaseAdmin
              .from("product_orders")
              .select("id,business_id,total_cents,payout_cents,paid_at,stripe_transfer_id")
              .eq("id", orderId)
              .maybeSingle();
            if (!order || order.paid_at) continue;

            await supabaseAdmin
              .from("product_orders")
              .update({
                status: "paid",
                paid_at: new Date().toISOString(),
                ...(paymentIntentId ? { stripe_payment_intent_id: paymentIntentId } : {}),
              })
              .eq("id", orderId);

            // Draw down inventory for each line.
            const { data: items } = await supabaseAdmin
              .from("product_order_items")
              .select("product_id,quantity")
              .eq("order_id", orderId);
            for (const item of items ?? []) {
              if (!item.product_id) continue;
              const { data: prod } = await supabaseAdmin
                .from("inventory_products")
                .select("stock_qty")
                .eq("id", item.product_id)
                .maybeSingle();
              if (!prod) continue;
              await supabaseAdmin
                .from("inventory_products")
                .update({ stock_qty: Math.max(0, (prod.stock_qty ?? 0) - item.quantity) })
                .eq("id", item.product_id);
            }

            // Pay the vendor via Stripe Connect.
            const { data: biz } = await supabaseAdmin
              .from("businesses")
              .select("stripe_account_id,payouts_enabled")
              .eq("id", order.business_id)
              .maybeSingle();
            if (!biz?.stripe_account_id || !biz.payouts_enabled || order.stripe_transfer_id) continue;
            try {
              const transfer = await stripe.transfers.create(
                {
                  amount: order.payout_cents ?? 0,
                  currency: "usd",
                  destination: biz.stripe_account_id,
                  transfer_group: `order_${orderId}`,
                  ...(chargeId ? { source_transaction: chargeId } : {}),
                  metadata: { order_id: orderId },
                },
                { idempotencyKey: `order-transfer-${orderId}` },
              );
              await supabaseAdmin
                .from("product_orders")
                .update({
                  stripe_transfer_id: transfer.id,
                  payout_released_at: new Date().toISOString(),
                })
                .eq("id", orderId);
            } catch (err) {
              console.error(`[stripe] vendor transfer failed for order ${orderId}`, err);
            }
          }
        };

        let bookingId: string | null = null;

        try {
          switch (event.type) {
            case "checkout.session.completed": {
              const session = event.data.object as Stripe.Checkout.Session;
              bookingId = bookingIdOf(session);
              if (bookingId && session.payment_status === "paid") {
                await supabaseAdmin
                  .from("bookings")
                  .update({
                    status: "confirmed",
                    escrow_state: "held",
                    ...(typeof session.payment_intent === "string"
                      ? { stripe_payment_intent_id: session.payment_intent }
                      : {}),
                  })
                  .eq("id", bookingId);
              }
              const orderIds = orderIdsOf(session);
              if (orderIds.length && session.payment_status === "paid") {
                const piId =
                  typeof session.payment_intent === "string" ? session.payment_intent : null;
                let chargeId: string | null = null;
                if (piId) {
                  const pi = await stripe.paymentIntents.retrieve(piId);
                  chargeId = typeof pi.latest_charge === "string" ? pi.latest_charge : null;
                }
                await settleProductOrders(orderIds, piId, chargeId);
              }
              break;
            }

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
          payload: JSON.parse(body),
          booking_id: bookingId,
          processed_at: new Date().toISOString(),
        });

        return Response.json({ received: true });
      },
    },
  },
});
