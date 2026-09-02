# Marina, wholesale, discovery, notifications & angler polish

Five workstreams, built in this order. Everything reuses the existing booking spine, cron hook pattern and outbox — no parallel paths.

## 1. Marina vertical

**Bookable slips**
- Each slip gets an optional linked `bookable_services` row of kind `slip_rental` (nightly and monthly rate, capacity 1, deposit + cancellation policy from the marina's settings).
- "Publish slip for online booking" toggle in the Slips tab creates/updates that service and generates `service_availability` nights over a rolling window, skipping nights already covered by a manual reservation or a blocked slip.
- Anglers/boaters book through the same flow as charters: `reserve_slot` hold → deposit checkout → escrow → payout. Booking dates render as "arrive → depart" nights instead of a departure time.
- Confirmed slip bookings appear in the marina's Reservations list next to manual ones, marked as booked online.

**Services tab (replaces placeholder)**
- Amenity toggles stored on the business: fuel, ice, pump-out, laundry, haul-out, wifi, showers, power, water — shown on the marina storefront.
- Service-request inbox: boaters submit a request (amenity, vessel, date, note) from the storefront; marina staff triage new → scheduled → done → declined, with an internal note.

**Reservation calendar**
- Month calendar with arrivals and departures per day, occupancy count and a day drawer listing that day's boats; the existing table stays as a "List" toggle.

## 2. Wholesale, trade accounts & variants

**Wholesale pricing**
- Per-product wholesale settings: MOQ, case pack, wholesale-only flag, and tiered price breaks (qty ≥ N → unit price).
- Trade pricing is only visible and purchasable to an approved trade buyer; retail shoppers never see it, and wholesale-only products are hidden from the public marketplace.

**Trade accounts**
- Buyers apply from a brand's storefront (business name, tax/reseller ID, contact, note); brands approve or reject in a Trade accounts tab.
- Approved buyers see wholesale pricing, MOQ enforcement and break pricing in cart and at checkout.

**Variants**
- Product variants with option name/value (size, colour, weight), per-variant SKU, price delta and stock.
- Dashboard: variant editor on the product form. Storefront: option selector on the product page; cart, stock decrement, and refund restock all operate on the chosen variant.

## 3. Discovery & ranking

- Discover and the search pages fetch ranked results from `rank_listings` and fall back to the plain query when scoring returns nothing.
- New search surfaces for guided trips, slips, lodging and workshops, reusing the charter search filter shell (location, dates, price, party size, plus per-kind filters).
- Impression logging with position and the active query/feature vector when result cards enter the viewport, batched so it never blocks rendering.
- Nightly cron hook `/api/public/hooks/recompute-metrics` calling `recompute_listing_metrics`, guarded by the shared cron secret.

## 4. Notifications — last mile

- Connect a sending domain so transactional email actually leaves the platform, then verify with a real booking.
- Angler notification preferences screen in account settings (per-category email toggles + master switch), matching the operator one.
- Reminder events emitted by the timers job: trip T-48h and T-24h to both sides, and an unread-message nudge when a message sits unread past the threshold. Each is idempotent per booking and window so a reminder can never double-send.

## 5. Angler-side polish

- Merchandise order history: order status timeline, tracking number, shipping address, per-item lines, and a "request refund" action that opens a vendor-visible request.
- Vendor shipping & returns note shown on the product page and in the cart before payment.
- Out-of-stock and low-stock states on product cards and the buy button.

## Technical notes

- Slip bookings reuse `bookable_services` + `service_availability` + `reserve_slot`; no new reservation state machine. Manual reservations and online bookings both write availability so they can't collide.
- New tables (marina service requests, wholesale settings/tiers, trade accounts, product variants) each ship with GRANTs and owner-scoped RLS; public reads stay `TO anon` on published rows only, and trade pricing is never readable by `anon`.
- Metrics recompute goes on the existing `/api/public/hooks/*` pattern with the shared cron-secret guard, scheduled with pg_cron like the other jobs.
- Reminder and nudge events flow through `domain_events` → outbox dispatcher → existing notification consumer, keeping email out of the request path.
