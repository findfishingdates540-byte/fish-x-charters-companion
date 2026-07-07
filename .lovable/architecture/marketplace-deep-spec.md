# Marketplace Deep Spec — Booking, Payments, Ranking

*Three build-ready technical specs for a fishing charter (FishingBooker-class) marketplace.*

Companion to the architecture reference. This goes one level down on the three layers where correctness and money are on the line.

---

# Part 1 — Booking state machine

The booking is the spine of the whole system. Payments, messages, reviews, and disputes all hang off a single `Booking` record, and its state controls what every other service is allowed to do. Get this wrong and you double-book a captain, double-charge an angler, or pay out money that should have been refunded.

## 1.1 States

| State | Meaning | Money status | Slot status |
|---|---|---|---|
| `inquiry` | Angler requested a slot; no payment yet | none | soft hold (TTL) |
| `pending_payment` | Checkout started; awaiting capture | authorizing | soft hold (TTL) |
| `pending_confirmation` | Paid/authorized; captain must accept (non-instant-book) | held by platform | soft hold (extended TTL) |
| `confirmed` | Booking is live | held in escrow | **hard locked** |
| `in_progress` | Trip date reached (optional intermediate) | held in escrow | locked |
| `completed` | Trip finished + grace window started | held, awaiting release | consumed |
| `reviewed` | Review submitted (or review window closed) | released to captain | consumed |
| `declined` | Captain rejected | refunded/voided | released |
| `expired` | Hold/payment timed out | voided | released |
| `cancelled_angler` | Angler cancelled | refunded per policy | released |
| `cancelled_captain` | Captain cancelled | full refund + penalty to captain | released |
| `no_show` | Angler didn't show | per policy (often non-refundable) | consumed |
| `disputed` | Dispute opened | **frozen** (no payout) | consumed |
| `refunded` | Refund completed | refunded | released |

Terminal states: `reviewed`, `declined`, `expired`, `cancelled_*`, `no_show` (resolved), `refunded`. `disputed` is non-terminal — it resolves into `completed/reviewed` (captain wins) or `refunded` (angler wins).

## 1.2 Happy path

```
inquiry → pending_payment → [pending_confirmation] → confirmed → in_progress → completed → reviewed
                                                                                     │
                                              (instant-book skips pending_confirmation)
```

## 1.3 Transition table (authoritative)

| From | Event | Guard | To | Side effects |
|---|---|---|---|---|
| `inquiry` | `start_checkout` | slot still held | `pending_payment` | extend hold TTL |
| `inquiry` | `hold_timeout` | TTL expired | `expired` | release slot |
| `pending_payment` | `payment_captured` | instant-book on | `confirmed` | hard-lock slot, emit `booking.confirmed` |
| `pending_payment` | `payment_captured` | instant-book off | `pending_confirmation` | hold funds, notify captain |
| `pending_payment` | `payment_failed` | — | `inquiry` | release toward expiry |
| `pending_payment` | `payment_timeout` | — | `expired` | void auth, release slot |
| `pending_confirmation` | `captain_accept` | within accept window | `confirmed` | hard-lock slot, emit `booking.confirmed` |
| `pending_confirmation` | `captain_decline` | — | `declined` | refund/void, release slot |
| `pending_confirmation` | `accept_timeout` | window elapsed | `declined` | auto-refund, release slot |
| `confirmed` | `trip_date_reached` | — | `in_progress` | start completion timer |
| `confirmed` | `angler_cancel` | — | `cancelled_angler` | refund per policy, reverse transfer if needed |
| `confirmed` | `captain_cancel` | — | `cancelled_captain` | full refund, apply captain penalty |
| `in_progress` | `trip_end + grace` | no dispute | `completed` | start payout timer |
| `in_progress` | `mark_no_show` | captain attests | `no_show` | apply no-show policy |
| `completed` | `payout_window_elapsed` | no dispute | `reviewed` (or release) | release payout to captain |
| `completed` | `review_submitted` | verified booking | `reviewed` | publish review, feed ranking |
| `completed` / `in_progress` | `open_dispute` | within dispute window | `disputed` | freeze payout |
| `disputed` | `resolve_captain` | admin decision | `completed` | release payout |
| `disputed` | `resolve_angler` | admin decision | `refunded` | refund, reverse transfer |

## 1.4 Concurrency & correctness — the part that matters

Three mechanisms together guarantee a slot is never double-sold:

1. **Soft hold (Redis, TTL).** When checkout starts, write `hold:{slot_id} = booking_id` with `SET NX EX <ttl>`. If the key exists, the slot is taken — block the second angler. The TTL auto-releases abandoned carts.
2. **Hard lock (Postgres, at confirmation).** On the `→ confirmed` transition, inside a single transaction: `SELECT ... FOR UPDATE` the slot row, assert it has no confirmed booking, then write the booking and flip the slot to `booked`. Row-level lock + uniqueness constraint (`UNIQUE(slot_id) WHERE status='confirmed'`) makes a double-confirm physically impossible.
3. **Idempotency keys.** Every state-changing API call (and every payment call) carries a client-generated idempotency key. Store processed keys; a retried request returns the original result instead of re-executing. This survives network retries, double-clicks, and webhook redelivery without double-charging or double-booking.

## 1.5 Timers (drive automatic transitions)

| Timer | Window (typical) | Fires |
|---|---|---|
| Hold TTL | 10–15 min | `inquiry/pending_payment → expired` |
| Captain accept window | 24 h | `pending_confirmation → declined` |
| Completion grace | trip end + 24–48 h | `in_progress → completed` |
| Payout window | completion + 1–7 days | release funds |
| Dispute window | completion + N days | locks dispute eligibility |
| Review window | completion + 14–30 days | closes review eligibility |

Implement timers as scheduled jobs / delayed queue messages, not in-process timers — they must survive restarts.

## 1.6 Events emitted (for the async layer)

`booking.created`, `booking.confirmed`, `booking.cancelled`, `booking.completed`, `payout.released`, `review.unlocked`, `dispute.opened/resolved`. Downstream workers handle email/SMS, search-index updates, payout processing, and analytics. The booking service only writes its own state + emits; it never calls email/payout synchronously.

## 1.7 Design rules

- **Single source of truth for state** — one column, one enum, guarded transitions. No deriving state from payment status.
- **Every transition is logged** (who/what/when) for audit and dispute resolution.
- **Money and state move in the same transaction** wherever possible; where they can't (external PSP), use idempotency + reconciliation.
- **Reject illegal transitions loudly** rather than silently no-op.

---

# Part 2 — Stripe Connect: payouts & escrow

A two-sided marketplace needs to collect from anglers, hold funds, take commission, and pay captains — including KYC and global payouts. Building this yourself is months of regulated work. Stripe Connect (or Adyen for Platforms) does it. This spec assumes **Stripe Connect**.

## 2.1 Account type

| Type | Onboarding/KYC | Dashboard | Liability | Use when |
|---|---|---|---|---|
| **Express** | Stripe-hosted flow | Stripe-lite for captains | shared | **Recommended default** — fastest, Stripe handles KYC |
| Custom | You build everything | none | you own it | full white-label, deep ops investment |
| Standard | Captain has own full Stripe account | full Stripe | captain | captains who want their own Stripe |

Use **Express**: captains onboard via a Stripe-hosted Account Link, Stripe handles identity verification and compliance, you keep a clean branded checkout.

## 2.2 Charge model — separate charges and transfers (escrow)

To **hold funds and release after the trip**, do NOT use a destination charge that pays the captain immediately. Use **separate charges and transfers**:

1. **Charge the angler to the platform account.** Create a `PaymentIntent` on your platform; funds land in your platform balance. You now hold the money (escrow).
2. **Hold** through the dispute window — funds simply stay in your balance.
3. **Transfer to the captain on completion.** Create a `Transfer` to the captain's connected account for `amount − commission`. Your commission stays in the platform balance.

This cleanly separates "money in" from "money out" and gives you a real escrow window. (A destination charge with `transfer_data` pays out at capture time — wrong for delayed release.)

## 2.3 Money math

```
angler_pays            = trip_price (or deposit)
platform_commission    = trip_price × commission_rate   // your revenue
stripe_fee             = Stripe's processing fee          // ~2.9% + fixed, varies
captain_receives       = trip_price − platform_commission − (fee allocation)
```

Decide who absorbs the Stripe fee (platform or split) and encode it explicitly. Commission is your `application_fee` equivalent — but with separate transfers you implement it simply by transferring `price − commission`.

## 2.4 Deposits vs. full payment

- **Manual capture:** create the `PaymentIntent` with `capture_method: manual` to authorize at booking, capture on captain acceptance. Avoids charging before a non-instant-book captain confirms.
- **Deposit now, balance later:** two PaymentIntents — deposit at booking, remainder on a schedule before the trip. Track both against the booking.

## 2.5 Refunds & reversals

- **Before transfer** (funds still on platform): `Refund` the PaymentIntent. Simple.
- **After transfer** (captain already credited): `Refund` **and** `reverse_transfer` to claw the funds back from the connected account. Partial refunds reverse proportionally.
- The **cancellation policy engine** (flexible/moderate/strict) computes the refundable fraction; the payment service executes it.

## 2.6 Payout timing

- Funds reach the captain's **connected balance** via your Transfer; Stripe then **pays out** to their bank on a schedule.
- Control release with `delay_days` on the connected account, or use **manual payouts** for full control of when money leaves.
- Net effect: angler charged at booking → held on platform → transferred post-trip → paid to bank on schedule.

## 2.7 Onboarding flow (Express)

1. Captain signs up → you create a connected `Account` (`type: express`).
2. Generate an **Account Link** → redirect captain to Stripe-hosted onboarding (identity, bank details).
3. Stripe verifies (KYC/AML). Listen for `account.updated`; gate "can receive payouts" on `charges_enabled` / `payouts_enabled`.
4. Block a captain from going live until onboarding is complete.

## 2.8 Webhooks to handle (source of truth — never trust the client)

| Event | Action |
|---|---|
| `payment_intent.succeeded` | advance booking → confirmed / pending_confirmation |
| `payment_intent.payment_failed` | fail the booking attempt |
| `charge.refunded` | mark refund complete |
| `transfer.created` / `transfer.reversed` | record payout / clawback |
| `payout.paid` / `payout.failed` | captain payout status |
| `account.updated` | onboarding/payout-eligibility changes |
| `charge.dispute.created` | chargeback → open internal dispute, freeze |

Verify webhook signatures. Make handlers **idempotent** (Stripe redelivers).

## 2.9 Compliance & safety

- **PCI:** use Stripe.js / Elements / Checkout so card data never touches your servers — keeps you in the lowest PCI tier.
- **SCA / 3-D Secure:** PaymentIntents handle European Strong Customer Authentication automatically.
- **Idempotency keys** on every create call.
- **Reconciliation job:** periodically compare your booking/payment records against Stripe's to catch drift.

## 2.10 End-to-end sequence

```
1. Angler checks out      → create PaymentIntent (platform), manual capture
2. Captain accepts        → capture PaymentIntent  (funds → platform balance = escrow)
3. Trip completes + grace → no dispute
4. Payout window elapses  → create Transfer (price − commission) → captain connected acct
5. Stripe payout schedule → funds → captain bank
   (Refund path: Refund [+ reverse_transfer if already sent], prorated by policy)
```

---

# Part 3 — Ranking signal design

Search result order directly decides which captains earn money, so ranking is the platform's most consequential algorithm. Build it as a **tunable, logged, A/B-tested scoring function**, never a hardcoded sort.

## 3.1 Signal categories

| Category | Example signals | Why it matters |
|---|---|---|
| **Relevance** | text match, species match, geo distance, date availability | must actually fit the query |
| **Quality** | avg review rating, review count, photo quality/count, profile completeness | predicts satisfaction |
| **Reliability** | response rate, response time, acceptance rate, cancellation rate, no-show rate | predicts a smooth booking |
| **Conversion** | listing CTR, view→book rate, recent booking velocity | predicts the listing converts |
| **Commercial** | price competitiveness vs. comparable trips, commission tier | platform economics |
| **Freshness** | recency of last availability update, new-listing boost | avoid stale/dead listings |
| **Personalization** | angler's past species/region/price band, device, locale | relevance to *this* user |

## 3.2 Scoring function

Start with a transparent weighted sum, normalize every signal to [0,1], tune weights with experiments:

```
score(listing | query, user) =
      w_rel  · relevance(listing, query)
    + w_qual · quality(listing)
    + w_rely · reliability(listing)
    + w_conv · conversion(listing)
    + w_comm · commercial(listing)
    + w_fresh· freshness(listing)
    + w_pers · personalization(listing, user)
```

- **Normalization:** min-max or z-score per signal so no raw-scale signal dominates.
- **Distance:** convert geo distance to a decaying score (closer = higher), capped by a search radius.
- **Recency decay:** weight recent bookings/reviews more — `exp(-age/τ)`.
- **Graduate to learning-to-rank (LambdaMART / gradient-boosted trees)** once you have enough labeled click/booking data; keep the weighted sum as the explainable baseline and cold-start fallback.

## 3.3 Cold start (new listings)

New captains have no conversion/review history and would never surface. Give a **time-boxed exploration boost** (or reserve a small fraction of impressions) so new listings earn real signal. Decay the boost as data accumulates. Without this, the marketplace ossifies around incumbents and supply growth stalls.

## 3.4 Anti-gaming

- Cap the marginal value of any single signal (e.g. review count saturates) to deter manipulation.
- Detect and discount fake reviews / self-bookings / coordinated rings.
- Penalize off-platform-leakage signals (sharing contact info to dodge commission).
- Don't let `commercial`/commission weight visibly dominate — it erodes angler trust and result quality.

## 3.5 Experimentation & guardrails

- **A/B test every weight change** against guardrail metrics: booking conversion, GMV, angler satisfaction, **and supply-side fairness** (impression/booking distribution across captains).
- **Log full feature vectors + outcomes** for every impression so you can train and back-test offline.
- Watch for feedback loops: ranking high → more bookings → ranks higher. Counter with exploration so the model keeps learning instead of self-confirming.

## 3.6 Practical build order

1. Weighted sum with hand-set weights (ship this first — it's explainable and good enough).
2. Instrument: log impressions, clicks, bookings, feature values.
3. A/B harness + guardrail dashboards.
4. Tune weights empirically.
5. Migrate to learning-to-rank once data volume justifies it; keep the sum as fallback.

---

## Cross-cutting reminders

- **Idempotency everywhere** money or state moves.
- **Webhooks/PSP are the source of truth** for payment outcomes — never the browser.
- **Log every transition, payout, and ranking decision** — disputes and model training both depend on it.
- **Ship the simple version first**: weighted-sum ranking, modular monolith, Express accounts. Add ML, services, and Custom accounts only when a real bottleneck demands it.

---

*Reference spec — adapt windows, rates, and weights to your market and risk tolerance.*
