# Convert dashboards to React + wire to Supabase

Goal: Replace the iframe-rendered HTML dashboards with real React routes that read/write live Supabase data. Keep the current visual design pixel-close so nothing looks off-brand. Seed demo data so screens have something to show on day one.

## Scope (all 15 templates)

Public pages
- `/marketplace` — trip/charter grid, filters, search
- `/trips/detail` → `/trips/$id` — trip detail
- `/captains/profile` → `/captains/$slug` — captain public profile
- `/guides/profile` → `/guides/$slug` — guide public profile

Authenticated dashboards (routed by role + business category)
- Angler dashboard
- Captain dashboard
- Tackle shop dashboard
- Marina dashboard
- Gear manufacturer dashboard
- Apparel brand dashboard
- Guide service dashboard
- Onboarding wizard
- Booking flow (`/book/$serviceId`)
- Booking detail (angler + captain views)
- Resolution center

## Approach

**Pixel-match, not redesign.** For each page I take the existing `public/dashboards/*.html`, port the markup 1:1 into a React component tree under `src/components/<persona>/`, keep the same Tailwind/utility classes, and reuse `support.js` behaviors as small React hooks (parallax, tab state, modals). No visual drift.

**Shared primitives first.** Before converting individual pages I extract the pieces every dashboard reuses:
- `<DashboardShell>` — sidebar + topbar chrome
- `<KpiCard>`, `<StatTile>`, `<EmptyState>`, `<StatusPill>`
- `<Sidebar>` per persona (nav items differ by role)
- Motion/parallax hooks distilled from `support.js`

**One route at a time, ship as we go.** Each conversion is: build components → swap iframe route to React → verify against the HTML reference (kept in `public/dashboards/` per your answer) → move on.

## Data layer

Server functions in `src/lib/*.functions.ts` behind `requireSupabaseAuth`, called via TanStack Query. New functions grouped by domain:

- `bookings.functions.ts` — list/get bookings by role, transition via `transition_booking` RPC
- `services.functions.ts` — list/create/update `bookable_services` and `trip_templates`
- `businesses.functions.ts` — my business, members, followers
- `messages.functions.ts` — `booking_messages` + `business_messages`
- `reviews.functions.ts`
- `marketplace.functions.ts` — public search over businesses/services (publishable-key client, anon SELECT policies)
- `dashboard.functions.ts` — persona-specific KPI aggregations (angler upcoming trips, captain revenue/occupancy, etc.)

Loaders in `_authenticated/*` routes `ensureQueryData` for critical widgets, `prefetchQuery` for below-the-fold panels.

## Demo seed

One migration inserts:
- 6 demo captain accounts (via `auth.users` + profiles + `user_roles`)
- 6 businesses across every vertical (Charter, Tackle, Marina, Gear, Apparel, Guide)
- 12 bookable services / trip templates with photos hotlinked from existing CDN assets
- 30 bookings spanning statuses (inquiry → confirmed → completed → reviewed)
- 15 reviews, 10 followers, sample messages
- One demo angler for logged-in previews

Seed uses deterministic UUIDs so re-running is idempotent.

## Rollout order

1. **Foundations** — shared shell, sidebar, hooks, query wiring, demo seed migration
2. **Marketplace + trip detail + captain/guide public profiles** (SEO-critical, drives everything)
3. **Angler dashboard + booking flow + booking detail**
4. **Captain dashboard** (biggest — pipeline, calendar, listings, payouts)
5. **Tackle / Marina / Gear / Apparel / Guide dashboards** (share the business-owner shell, differ in KPIs and modules)
6. **Onboarding wizard** (writes to `businesses` + `business_categories` + `business_members`)
7. **Resolution center** (reads `disputes`, `booking_transitions`, `booking_messages`)

At the end of each step you get working routes to click through. HTML files stay in `public/dashboards/` as reference.

## Technical notes

- Route file naming stays flat-dot per TanStack convention; dynamic segments use `$id` / `$slug`
- All mutations go through `createServerFn` + `useMutation` + `queryClient.invalidateQueries`
- Booking state changes always call the `transition_booking` RPC (never direct UPDATE) so the audit trail + outbox stay consistent
- Public marketplace reads use the server publishable client + existing `TO anon` SELECT policies; no admin client on public paths
- New `og:image` on trip/captain/guide detail pages derived from loader data

## Deliverable of step 1 (this next turn)

Shared shell + hooks + query setup + seed migration + one converted page (angler dashboard) so you can see the pattern end-to-end before I steamroll the rest.

Reply "go" and I start with step 1.