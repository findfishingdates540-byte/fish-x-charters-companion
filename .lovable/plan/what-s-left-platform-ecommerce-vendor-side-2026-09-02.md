# What's left — platform + ecommerce vendor side

## Ecommerce vendor side (verified gaps)

1. **Product images can't be added from the dashboard.** `inventory_products.images` exists and is used everywhere (marketplace grid, product page, Stripe line items), but the Add/Edit product form has no image field at all — every vendor product ships imageless. Add the same multi-image uploader used for boats/listings (cover + gallery), with signed-URL previews.
2. **Editing a product silently wipes the description.** The form initialises description to an empty string instead of the saved value, so any edit blanks it. Fix by seeding from the loaded product (and returning `description` in the overview query).
3. **No shipping address is collected.** `product_orders.shipping_address` is never populated: Stripe Checkout runs without address collection, so vendors have nothing to ship to. Enable address collection in the session and persist the address on the order from the webhook; show it on the order card in the Orders tab.
4. **Shipping cost comes from the browser.** The checkout accepts `shippingCents` from the client, so it can be set to 0. Move shipping to vendor-owned settings (flat rate / free-over threshold per business) and compute it server-side per vendor group — today it's also charged only once for the first vendor in a multi-vendor cart.
5. **No refund/cancel path for vendors.** Order status can be set to `refunded`/`cancelled` in the enum, but nothing reverses the Stripe charge, reverses the transfer, or restocks inventory. Add a vendor "Refund order" action backed by a server function (refund + `reverse_transfer` when the payout already left + stock restore).
6. **Payout visibility is missing for shops.** Delivery starts the 72h clock and a job releases the payout, but the shop dashboard shows no payouts view — add a Payouts tab (pending / released / paid out, per-order fee breakdown) like the charter side has.
7. **Fee copy is inconsistent.** Vendor-facing text says 8% commission; the checkout module header still describes an 80/20 split. Confirm the real `PRODUCT_FEE_RATE` and make code comments, dashboard copy and payout screens agree.
8. **No variants.** Products are single-SKU only — sizes/colours for apparel need an options model if apparel brands are onboarding.
9. **Vendor storefront gaps.** Marketplace product page has no seller shipping/returns policy, no stock-out state beyond the count, and no order confirmation email to the buyer or new-order notification to the vendor.

## Rest of the app

- **Notifications** — table and bell exist; still no email channel, preferences, or full event→notification coverage (order placed/shipped, payout released, dispute).
- **Cancellation & refunds for bookings** — policy engine exists for reschedules; automated refund maths on cancellation still needs finishing end to end.
- **Ranking** — `listing_metrics`/`listing_impressions` tables exist; scoring and the nightly recompute job aren't wired into discovery.
- **Admin console** — no verification queue, dispute queue, payout/refund ledger, or booking timeline viewer.
- **Reconciliation** — no job comparing Stripe balance transactions to `payouts`/`refunds` rows.

## Suggested order

Vendor blockers first (1 → 3 → 4 → 5), then payout visibility (6) and copy (7), then notifications, then variants and ranking.

## Technical notes

- Image upload reuses `ImageUpload` + `signMediaUrls`; store paths in `images` and sign on read in `tackle.functions.ts`.
- Shipping rules live on `businesses.metadata` or a small `vendor_shipping_settings` table with GRANTs + owner-scoped RLS.
- Refunds go through a `createServerFn` calling Stripe with `reverse_transfer`, then a SECURITY DEFINER RPC for the order-status + restock transaction.
