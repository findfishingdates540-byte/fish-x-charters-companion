## Fish-X Charters → Fish-X Business Platform: Foundation Plan

Pivot the app from "captain-only charter tool" to a **multi-persona business platform** inside the Fish-X ecosystem. Anglers (consumers in the main Fish-X app) discover, follow, message, and book operators; operators (charter, tackle shop, marina, apparel, gear, guides, lodges, bait shops) run a business profile, post content, accept bookings, and sponsor challenges.

This plan covers the **foundation only**: roles, schema, RLS, storage, bridge, and minimal UI scaffolding. No deep feature build yet — we ship the platform skeleton so every later feature has a place to land.

---

### 1. Roles & identity

Extend `app_role` enum:
- `angler` — consumer-side user (mirrors a Fish-X user via `fishx_user_id`)
- `business_owner` — creates/owns a business
- `business_staff` — invited member of a business
- `captain` *(kept; becomes a business sub-type)*
- `admin` — platform staff (verification, moderation)

Signup flow: user picks **Angler** or **Operator**. Angler → `angler` role. Operator → `business_owner` role + onboarding wizard creates their first `business` row.

Per-business permissions live in `business_members.role` (`owner|manager|staff`), not in `user_roles`. `has_role()` stays for platform-wide roles; add `is_business_member(_business_id, _user_id, _min_role)` security-definer helper for business-scoped RLS.

---

### 2. Database schema (Supabase migrations)

**Core directory**
- `business_categories` (seeded: charter, tackle_shop, marina, apparel, gear_mfg, guide_service, lodge, bait_shop)
- `businesses` (slug, name, category_key, description, hero_url, contact, address, lat/lng, `hours_json`, `amenities_json`, `verified_at`, `premium_until`, `fishx_business_id`)
- `business_members` (business_id, user_id, role, UNIQUE)
- `verification_requests` (docs, status, reviewer, decision)

**Social surface**
- `business_posts` (body, `media_json`, `linked_challenge_id`, visibility)
- `post_likes`, `post_comments`
- `business_followers` (PK business_id+user_id)

**Messaging**
- `business_buddies` (angler↔business connect request)
- `business_conversations` (one per business↔angler pair)
- `business_messages` (sender = business|angler, body, media, read_at)

**Bookings (multi-persona — not charter-only)**
- `bookable_services` (business_id, kind: `charter_trip|guided_trip|slip_rental|lodging|workshop|rental`, title, duration, capacity, `pricing_json`, `policies_json`) — replaces the captain-only `trip_templates` (kept as a backing row type for charters)
- `service_availability` (service_id, date/time windows, blackout)
- `bookings` (extended): add `business_id`, `service_id`, `angler_id`, `stripe_payment_intent_id`, `escrow_state`, `cancellation_policy`, keep existing status enum + extend with `refunded|disputed|weather_cancelled`
- `booking_messages` (thread scoped to a booking)
- `reviews` (booking_id, rating, body, response_body) — powers "4.96★"

**Sponsored challenges (Fish-X bridge)**
- `sponsored_challenges` (business_id, `fishx_challenge_id`, prize_cents, status, signed_at, region_json)
- `fishx_link` (charters_user_id ↔ fishx_user_id, scopes, linked_at) — used by both anglers and businesses

**Subscriptions & payments**
- `business_subscriptions` (stripe_customer_id, stripe_sub_id, tier: `free|pro|premium`, period_end, status)
- `payouts`, `payment_events` (Stripe webhook log)

**Platform**
- `audit_logs` (actor, action, target, meta)
- `fishx_webhook_events` (idempotent inbound bridge log)

All tables: `GRANT` block per house rules, RLS enabled, policies via `has_role()` / `is_business_member()` / `auth.uid()`. Public-read tables (`businesses`, `business_posts` where `visibility='public'`, `business_categories`, `reviews`) get narrow `TO anon` SELECT policies for SSR discovery pages.

**Storage buckets**: `business-media` (public), `verification-docs` (private, admin-read), `post-media` (public), `avatars` (public).

---

### 3. Fish-X bridge (server-only)

Already scaffolded in `src/lib/fishx-api.server.ts`. Add:
- **Outbound server fns** (`src/lib/fishx.functions.ts`): `createSponsoredChallenge`, `linkAnglerByEmail`, `pushBookingCompleted` (so a completed charter logs a Fish-X catch entry).
- **Inbound webhook route** `src/routes/api/public/fishx-webhook.ts`: HMAC-verified, writes to `fishx_webhook_events`, then dispatches (e.g. angler signup → upsert `fishx_link`).
- Secrets: `FISHX_API_BASE_URL`, `FISHX_API_HMAC_SECRET`, `FISHX_WEBHOOK_SECRET` (request via `add_secret` after plan approval).

---

### 4. Auth & onboarding

- Keep existing `/auth` UI. Wire the "joining as" toggle to actually assign `angler` vs `business_owner` (currently both become `captain`).
- New `_authenticated/onboarding.tsx`: if user is `business_owner` and has no business, run a 3-step wizard (category → name/slug/location → hours/contact) that creates the `businesses` row + `business_members` owner row.
- Update `handle_new_user()` trigger to read `raw_user_meta_data.intended_role` and assign accordingly (no captain default).
- Enable Google + Apple providers in Supabase (user action — flag in plan).

---

### 5. Minimal UI scaffolding (foundation only — no deep features)

Just enough routes to prove the schema and let later turns flesh out:
- `/` — existing marketing home (keep, light copy tweak to reflect multi-persona)
- `/discover` — public SSR list of businesses (filter by category, map placeholder)
- `/b/$slug` — public business profile (header, posts feed stub, services stub, follow/message CTA)
- `/_authenticated/onboarding` — operator wizard
- `/_authenticated/dashboard` — role-aware: angler sees followed businesses + bookings; business member sees their business switcher + stub tabs (Posts, Bookings, Messages, Sponsorships, Settings)
- `/_authenticated/business/$id/settings` — basic profile edit + member invites

All deeper screens (post composer, booking calendar, messaging UI, sponsor flow, Stripe Connect) are explicitly **deferred** to follow-up turns.

---

### 6. Design system

Keep existing maritime tokens (Deep Hull / Sandy Gold, Cormorant + Hanken). Add semantic tokens for:
- Category accent colors (8 categories)
- Verification badge states (unverified / pending / verified / premium)
- Booking status pills (reuse existing palette)

No visual rework of home or auth in this turn.

---

### Technical details

- **Migrations**: one large migration per logical group (directory, social, messaging, bookings, sponsorships, payments, platform) — easier to review than a single 30-table monster. Each follows the mandatory CREATE → GRANT → RLS ENABLE → POLICY order.
- **RLS helpers** (`SECURITY DEFINER`, `STABLE`, `search_path=public`):
  - `is_business_member(business uuid, user uuid, min_role text)` → bool
  - `business_is_public(business uuid)` → bool (for anon read of posts/reviews)
- **Existing tables** (`boats`, `trip_templates`, `customers`, `bookings`): keep, but add `business_id` columns and backfill from `captain_id → businesses.owner`. `trip_templates` becomes the charter-specific backing row for `bookable_services`.
- **Server fns** for every protected read (`getMyBusinesses`, `getBusinessBySlug`, `listPublicBusinesses`) — public ones use the server publishable client; protected ones use `requireSupabaseAuth`.
- **Storage RLS**: business members can write to `business-media/$business_id/*`; anyone can read.
- **No Stripe integration code yet** — columns exist, wiring is a separate plan once we pick Stripe Connect vs Paddle.

---

### Out of scope for this turn

Stripe Connect / escrow flow, map tile provider choice, push notifications, full messaging UI, post composer & feed, review submission UX, admin verification console, mobile-specific layouts, marketing site rewrite.

---

### Open questions before I build

1. **Booking model for non-charters**: do tackle shops / apparel brands take *bookings* at all, or only charters/guides/lodges/marina slips? (Affects whether `bookable_services` is on every business or only some categories.)
2. **One user, multiple businesses?** Common for guide services + lodge owners. I've designed for it (many-to-many via `business_members`); confirm OK.
3. **Anglers**: are they created here, or always provisioned via the Fish-X bridge (i.e. signing up as Angler here triggers a Fish-X account creation)?
4. **Stripe Connect vs Paddle** for marketplace payouts — pick now so I shape `business_subscriptions` + `payouts` correctly, or defer.