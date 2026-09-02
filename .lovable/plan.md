# What's left across the app and the other verticals

Vendor/ecommerce work from the last plan is done (photos, shipping settings, addresses, refunds, payouts view). This is the remaining gap list, checked against the current code, ordered by what blocks real onboarding.

## 1. Admin console (biggest gap — nothing exists today)

There is no admin route anywhere in the app, so verification approvals, disputes and money oversight have no home.

- `/admin` shell gated on the `admin` role (server-side `has_role`, not client state).
- Verification queue: review `verification_requests`, view documents, approve/reject with a note (this is what flips a business to discoverable).
- Dispute queue: open cases from `disputes`, evidence, resolve with refund / release / partial.
- Money ledger: bookings, payouts, refunds, product orders with Stripe IDs and escrow state.
- Booking timeline viewer built on `booking_transitions` for support questions.

## 2. Marina vertical (least finished)

- Slips are managed manually only — anglers/boaters can't reserve a berth online. Wire slips to `bookable_services` (`slip_rental`) with nightly/monthly rates so a slip can be booked and paid through the same escrow spine.
- The "Services" tab is a placeholder. Ship amenity toggles (fuel, ice, pump-out, laundry, haul-out) and an inbound service-request inbox.
- Reservation calendar view (arrivals/departures by day) instead of the flat table.

## 3. Wholesale / manufacturer & apparel

They share the tackle dashboard today, which only models a single retail price.

- Wholesale pricing: MOQ, case pack, tiered price breaks, and a wholesale-only visibility flag so retail buyers don't see trade pricing.
- Buyer approval: an operator applies for a trade account, the brand approves before wholesale prices show.
- Product variants (size / colour / weight) with per-variant SKU and stock — currently every option has to be a separate product.

## 4. Discovery & ranking (built but unused)

- `rank_listings` and `getRankedListings` exist but nothing calls the ranked feed; discovery still uses plain listing queries. Wire ranked results into Discover and the search pages.
- Only charters have a search page. Add search for guided trips, slips, lodging and workshops using the same filter shell.
- Impressions aren't logged (only clicks), so the feature vectors are empty. Log impressions with position and query.
- No job recomputes `listing_metrics`. Add a nightly cron hook alongside the existing timer hooks.

## 5. Notifications — finish the last mile

The in-app + email pipeline is built and drains off the outbox. What's missing:

- Email domain isn't configured, so every email is skipped at send time. Connect a sending domain and verify a real booking sends.
- Notification preferences UI exists only in the business settings; anglers have no preference screen.
- No reminder events for trip T-48h / T-24h or unread-message nudges.

## 6. Angler-side polish

- Buyer order history for merchandise: tracking number, shipping address, "where's my order", and a way to request a refund from the buyer side.
- Storefront shipping & returns note (now editable by vendors) isn't shown on the product page or in the cart.
- Saved/wishlist and cart don't survive sign-in on another device (localStorage only).

## 7. Launch operations

- Reconciliation job comparing Stripe balance transactions against `payouts` / `refunds` and flagging drift.
- Readiness gate audit: confirm a business really can't be discovered until verification + payouts + a published listing + published availability all exist.
- Operator playbook page and a welcome email sequence for newly approved businesses.

## Suggested order

1. Admin console (unblocks approving real businesses)
2. Email domain + reminder events (operators and anglers must hear from the platform)
3. Marina bookability
4. Ranked discovery + metrics job
5. Wholesale pricing and variants
6. Reconciliation and launch ops

## Technical notes

- Admin surfaces read through `requireSupabaseAuth` and verify `has_role(uid,'admin')` inside each server function; privileged writes load `supabaseAdmin` inside the handler only after that check.
- Marina slip bookings reuse `bookable_services` + `service_availability` + `reserve_slot` rather than a parallel reservation path, so escrow, holds and payouts behave identically.
- New cron work goes on the existing `/api/public/hooks/*` pattern with the shared cron-secret guard.
- Wholesale pricing and variants need new tables with GRANTs and owner-scoped RLS; retail reads stay `TO anon` on published rows only.
