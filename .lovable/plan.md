# Go-live checklist: Stripe payments end to end

The webhook route `/api/public/stripe-webhook` and all secrets exist. The user has added the webhook endpoint in the Stripe Dashboard. What remains is making the stored signing secret match, publishing, and verifying real events flow.

## Steps

1. **Update the webhook signing secret (critical)**
   - In Stripe Dashboard → Developers → Webhooks → the `booking.fish-x.com` endpoint → "Reveal" the Signing secret.
   - Update `STRIPE_WEBHOOK_SECRET` in the project via the secure secret form (update_secret) with that `whsec_...` value.
   - Reason: each new webhook endpoint gets its own signing secret; the previously stored one will not match and every event would fail signature verification.

2. **Publish the app**
   - Publish so `https://booking.fish-x.com/api/public/stripe-webhook` serves the latest build (fallback URLs were already switched to booking.fish-x.com last turn).

3. **Verify webhook delivery**
   - From Stripe Dashboard, use "Send test webhook" for `checkout.session.completed` and `payment_intent.succeeded` — expect HTTP 200.
   - Confirm rows appear in `payment_events` (supabase--read_query) instead of signature errors.
   - Check Stripe Dashboard → Webhooks shows deliveries succeeding (no red/failing attempts).

4. **End-to-end smoke test**
   - Run a real (or live-mode test card) charter booking and a merchandise order; verify the booking flips to `confirmed` with escrow held, and the product order flips to `paid` with a payout due date.

5. **Business payout readiness**
   - Each operator must finish "Connect bank" in their Settings → Payouts (PayoutsConnect) until it shows Connected (charges + payouts enabled). The 4-second auto-polling card will flip on its own once Stripe finishes onboarding.

## Technical notes

- Webhook handler: `src/routes/api/public/stripe-webhook.ts` — verifies with `STRIPE_WEBHOOK_SECRET`, idempotent via `payment_events.stripe_event_id`, handles checkout.session.completed, payment_intent.succeeded / amount_capturable_updated / payment_failed, charge.refunded, charge.dispute.created, account.updated.
- Secrets present: STRIPE_SECRET_KEY (live), STRIPE_WEBHOOK_SECRET, CRON_SECRET. Only the webhook secret value needs to be replaced to match the new Stripe endpoint.
- No code changes required for steps 1–4 unless verification reveals a handler error.
