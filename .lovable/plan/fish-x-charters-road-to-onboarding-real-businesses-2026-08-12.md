# Fish-X Charters — Road to Onboarding Real Businesses

A phased plan measured against the marketplace deep spec (booking state machine, Stripe escrow, ranking) plus the notification layer the spec assumes but never details.

## Where we are today

| Spec area | Status |
|---|---|
| Booking state enum + guarded transitions + audit log (`transition_booking`) | Done |
| Domain event outbox + dispatcher cron (every minute) | Done (drains, but no consumers) |
| Stripe Connect Express onboarding, separate charges & transfers, 80/20 split | Done |
| Escrow release job (24h after completion, dispute-aware), cron every 15 min | Done |
| Stripe webhooks: checkout, payment succeeded/failed, refund, chargeback, account.updated | Done |
| Disputes + resolution center, reviews, messaging, marketplace/product checkout | Done |
| **Slot inventory, soft holds, hard lock, per-booking idempotency** | **Missing — bookings can clash** |
| **Non-instant-book (`pending_confirmation`) + accept/hold timers** | **Missing** |
| **Cancellation policy engine / prorated refunds & reversals** | **Missing** |
| **Notifications: email + in-app + alerts** | **Missing entirely** |
| **Ranking: weighted-sum scoring, impression logging use** | Tables exist, scoring not implemented |

---

## Phase 1 — Never double-sell a slot (blocking for onboarding)

The spec's three mechanisms (§1.4). Without this, four anglers can book the same trip.

1. Operator availability: publish real `service_availability` rows from each vertical's dashboard (dates, times, seats, price override, blackouts). Angler booking flow picks a slot instead of a free-text date.
2. `reserve_slot` SECURITY DEFINER RPC: locks the slot row `FOR UPDATE`, asserts remaining seats, writes a `booking_holds` row with a 15-minute TTL and the booking in `pending_payment` — all in one transaction.
3. Hard lock at confirm: partial unique index so one slot can carry only one confirmed booking beyond its seat count; `seats_available` decremented in the same transaction as the `→ confirmed` transition.
4. Idempotency: client-generated key on booking creation stored in `idempotency_keys`; a retry returns the original booking instead of creating a second one.
5. Expiry job on the existing hooks route: release stale holds, move `pending_payment → expired`, restore seats.

## Phase 2 — Request-to-book & the timers

1. Per-service `instant_book` flag. When off: capture-on-accept (`capture_method: manual`), booking lands in `pending_confirmation`, captain has 24h.
2. Accept / decline actions in the operator dashboards, with the accept deadline visible and counting down.
3. Timer job: accept window elapsed → auto-decline + void authorization; trip date reached → `in_progress`; trip end + grace → `completed`.
4. Cancellation policy engine (flexible / moderate / strict) stored per service, computing the refundable fraction; refund executes with `reverse_transfer` when the payout already left.

## Phase 3 — Notifications: email, in-app, alerts

Everything hangs off the existing outbox, so nothing sends synchronously.

**Infrastructure**
- Email domain + Lovable Emails setup, then branded transactional templates in the Fish-X palette.
- `notifications` table (recipient, kind, title, body, link, read_at, channel state) with owner-scoped RLS.
- `notification_preferences` per user: per-category email on/off, plus a global digest toggle.
- New consumer route `/api/public/hooks/notify` invoked by the dispatcher for each domain event — maps topic → recipients → in-app row + queued email. Idempotent per `(event_id, recipient, channel)`.

**Event → notification matrix**

| Event | Angler | Operator |
|---|---|---|
| `booking.created` / `pending_confirmation` | "Request sent, captain has 24h" | "New booking request — accept within 24h" |
| `booking.confirmed` | Confirmation + trip card | "Trip confirmed" |
| Accept window T-4h | — | Escalating reminder |
| Trip T-48h / T-24h | Reminder + what to bring | Manifest reminder |
| `booking.completed` | "Leave a review" | "Payout releases in 24h" |
| `payout.released` | — | "Payout sent" |
| `booking.cancelled_*` / `refunded` | Refund breakdown | Cancellation notice + penalty note |
| `dispute.opened` / `resolved` | Both sides + admin | Both sides + admin |
| New message | Unread-message nudge after 10 min | Same |
| Low stock / new order (retail) | — | Inventory + order alerts |
| Stripe requirements due / payouts disabled | — | "Action needed to keep getting paid" |

**In-app surface**
- Bell in the header with unread count, dropdown list, mark-read, deep links into the trip/booking/message.
- Realtime subscription on the `notifications` table so badges update live.
- Inline dashboard alert banners for the blocking cases: Stripe requirements due, verification rejected, accept deadline near, payout failed.

## Phase 4 — Ranking & discovery quality

1. Weighted-sum scorer over the existing `listing_metrics` (relevance, quality, reliability, conversion, freshness), normalized to [0,1] with hand-set weights.
2. Nightly job to recompute `listing_metrics` from bookings, reviews, response times, cancellations.
3. Log impressions and clicks with the full feature vector into `listing_impressions` (table already exists) for later tuning.
4. Cold-start boost for new listings, decaying as data accumulates; cap per-signal influence to deter gaming.

## Phase 5 — Operator readiness gate & launch ops

1. Onboarding completeness gate: a business becomes discoverable only with verification approved, Stripe payouts enabled, at least one published listing, and published availability.
2. Admin console: verification queue, dispute queue, payout/refund ledger, booking timeline viewer.
3. Reconciliation job comparing Stripe balance transactions against `payouts` / `refunds` rows, flagging drift.
4. Operator playbook page + email onboarding sequence for newly approved businesses.

---

## Technical notes

- Timers stay as pg_cron → `/api/public/hooks/*` routes (already the pattern); no in-process timers.
- All new money/state mutations go through SECURITY DEFINER RPCs so the transaction boundary holds, with the existing `transition_booking` remaining the only writer of `bookings.status`.
- Notification sends are consumers of `domain_events`, never inline in a server function, so a failing email never fails a booking.
- New tables (`notifications`, `notification_preferences`) ship with GRANTs plus owner-scoped RLS; the notify consumer writes with the service role.

## Recommendation

Phases 1 and 2 are prerequisites for taking real money from real anglers. Phase 3 can run in parallel once the event topics from Phase 2 exist. Suggest building Phase 1 first as a single vertical slice on charters, then generalizing to guides, marinas, and lodging.
