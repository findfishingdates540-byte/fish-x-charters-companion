# FishingBooker-Class Marketplace — System Architecture Reference

*A reverse-engineered, build-ready architecture for a fishing charter booking marketplace.*

---

## 0. Scope & honesty note

FishingBooker's literal internal architecture — exact service boundaries, ranking weights, database schemas, fraud rules — is proprietary and not public. This document does **not** claim to expose their private systems. It contains two things:

1. **Publicly observable facts** about their stack (job posts, tech fingerprinting, CDN/DNS signals, company disclosures).
2. A **complete reference architecture** that reproduces every capability a FishingBooker-class marketplace needs — the blueprint you would hand an engineering team to build the same product.

Treat sections marked *Observable* as fact and everything else as a battle-tested design pattern, not a leak.

---

## 1. What is publicly known (Observable)

- **Business model:** Online travel marketplace specializing in fishing — anglers book charters/guided trips; captains list inventory; the platform takes commission.
- **Base & team:** Headquartered in Belgrade, Serbia (Southeast Europe). Engineering organized in ~6-week delivery cycles. IT/engineering org in the dozens.
- **Infrastructure signals:** AWS — Amazon CloudFront (CDN) and Amazon S3 (object storage) are detectable.
- **Logging/observability:** ELK stack (Elasticsearch, Logstash, Kibana) for centralized logging.
- **Frontend signals:** Standard HTML/CSS/JS, Font Awesome / Glyphicons icon sets, Gravatar for avatars.
- **Growth/marketing layer:** Facebook Pixel, Google Ads, Google DoubleClick, Google Optimize (A/B testing) — a heavy programmatic-SEO and paid-acquisition operation sits on top of the product.
- **Implication:** A monolith-or-modular backend on AWS, SEO-first server-rendered pages, Elasticsearch doing double duty (logs + likely search), strong analytics instrumentation.

Everything below is the reference build.

---

## 2. System context — the actors

| Actor | What they do | Primary surface |
|---|---|---|
| **Angler (guest)** | Search, compare, book, pay, review, message | Public web (SEO/SSR), mobile web |
| **Captain / guide (supply)** | List trips, set price & availability, accept/decline, get paid | Captain dashboard |
| **Admin / ops / trust & safety** | Moderate listings, resolve disputes, manage payouts, fight fraud | Internal admin console |
| **External systems** | Payments, maps, email/SMS, KYC, analytics | API integrations |

The platform is a **two-sided marketplace**: every architectural decision serves either demand (anglers) or supply (captains), with a trust layer in the middle.

---

## 3. Architecture layers (public-facing structure)

### 3.1 Client layer
- **Public web app — server-side rendered (SSR).** SEO is existential for a travel marketplace; pages must render full HTML for crawlers. Programmatic landing pages per *location × species × trip-type* (e.g. "Tarpon fishing charters in Key West") number in the tens of thousands. This is the single biggest traffic driver and the reason SSR/SSG dominates over a pure SPA.
- **Captain dashboard.** Authenticated app: calendar/availability management, booking inbox, messaging, payout history, listing editor, performance stats.
- **Admin console.** Internal-only: moderation queues, dispute resolution, refund/payout controls, fraud review, content management for the SEO pages.

### 3.2 Edge layer
- **CDN (CloudFront):** caches static assets, images, and cacheable SSR pages close to users worldwide.
- **WAF:** blocks injection, bot, and credential-stuffing traffic.
- **Load balancer + TLS termination:** distributes to application servers, handles certificates.

### 3.3 API / application layer
- **API gateway / BFF (backend-for-frontend):** single entry, request routing, authentication, session handling, rate limiting, request validation.
- **Auth & identity:** email/password + social login (Google/Facebook), session tokens, role-based access (angler / captain / admin), password reset, email verification.

### 3.4 Core domain services
These can start as modules inside a modular monolith and split into services as load grows. Don't build microservices on day one.

| Service | Responsibility |
|---|---|
| **Search & ranking** | Query by location, species, date, price, boat type, party size; rank results; faceted filters; map-based search |
| **Listings / catalog** | Charter profiles, boats, trip types, photos, amenities, captain bios |
| **Availability & booking** | Real-time calendars, hold/lock logic, booking state machine, party size, pricing rules |
| **Payments & payouts** | Charge capture, deposits vs. full payment, refunds, commission split, captain payouts/escrow |
| **Messaging** | Angler ↔ captain pre- and post-booking chat, templated questions |
| **Reviews & ratings** | Post-trip reviews, verified-booking gating, captain responses |
| **Notifications** | Transactional email, SMS, push — confirmations, reminders, payout alerts |
| **Reporting / analytics** | Booking funnels, conversion, captain performance, GMV |

### 3.5 Data layer
- **PostgreSQL (primary, transactional):** users, listings, bookings, payments, reviews. ACID guarantees matter most here — a double-booked charter is a business failure.
- **Elasticsearch (search index):** denormalized, geo-aware listing index for fast faceted/geo search. Kept in sync from Postgres via change events.
- **Redis (cache + sessions):** hot listings, search-result caching, session store, rate-limit counters, distributed locks for booking holds.
- **Object storage (S3):** trip photos, captain documents, generated assets, served via CDN.
- **Analytics warehouse (e.g. Redshift / BigQuery / Snowflake):** offline aggregation for business intelligence, not in the request path.

---

## 4. The "hidden" layers — what isn't on the public map

These are where a marketplace actually lives or dies. They're invisible to users but represent most of the engineering value.

### 4.1 Ranking & relevance engine
Search results are not chronological. A weighted scoring model blends signals such as: text/geo relevance, conversion rate, response rate & speed, review score & volume, price competitiveness, availability freshness, cancellation history, and (often) commission tier. This ranking is the platform's most guarded asset because it directly controls captain revenue distribution. **Build it as a tunable, logged, A/B-tested scoring function — never hardcoded.**

### 4.2 Availability & concurrency control
The hardest correctness problem in the system. Two anglers must never confirm the same slot.
- Temporary **holds/locks** (Redis with TTL) when a booking starts.
- **Booking state machine:** `inquiry → pending → confirmed → completed → reviewed`, plus `declined / cancelled / refunded / disputed / no-show`.
- Idempotency keys on booking and payment writes to survive retries.
- Optimistic locking or row-level locks on the slot in Postgres at confirmation.

### 4.3 Payments, escrow & the commission engine
- **Split payments:** angler pays the platform; the platform holds funds and pays the captain after the trip (escrow-style), minus commission.
- **Commission engine:** percentage that may vary by captain tier, region, or promotion.
- **Deposit logic:** partial now, balance later, or pay-in-full.
- **Payout scheduling:** triggered on trip completion or a delay window for dispute protection.
- **Refund & cancellation policy engine:** tiered (flexible / moderate / strict) with automated proration.
- **Provider:** a marketplace-capable PSP (Stripe Connect, Adyen for Platforms, or similar) handling KYC, multi-party payouts, and global currencies. **Never store raw card data — stay out of PCI scope by tokenizing through the PSP.**

### 4.4 Trust, safety & anti-fraud
- Listing moderation (manual + automated) before a charter goes live.
- Captain identity/KYC verification (PSP-driven + document checks).
- Fraud scoring on bookings (stolen cards, fake listings, collusion, off-platform leakage).
- **Off-platform-payment detection:** marketplaces lose commission when parties transact directly; messaging is scanned for contact-info exchange and circumvention attempts.
- Review-integrity controls (only verified bookings can review; fake-review detection).
- Dispute & resolution workflow with admin tooling and audit trails.

### 4.5 Programmatic SEO machine
Arguably the real growth engine. A content/templating system generates and maintains tens of thousands of landing pages from structured data (location × species × season × trip-type), each with unique copy, internal linking, schema.org markup, sitemaps, and localized variants. This runs as a pipeline against the catalog, not as hand-authored pages.

### 4.6 Async / event layer
A message queue or event bus (SQS / Kafka / RabbitMQ) decouples slow or non-critical work from the request path:
- Email/SMS dispatch, search-index sync, payout processing, image processing/thumbnails, review reminders, analytics events, webhook delivery.
- **Pattern:** the booking service writes to Postgres and emits an event; downstream workers react. This keeps the user-facing path fast and the system resilient.

### 4.7 Observability & ops (Observable: ELK)
- **Logs:** ELK stack — centralized, searchable.
- **Metrics & tracing:** request latency, error rates, queue depth, conversion funnels; distributed tracing across services.
- **Alerting** on SLOs (booking success rate, payment success rate, search latency).

---

## 5. Core data model (entities)

```
User ──< Listing ──< Trip/TripType
User (captain) ──< Boat
Listing ──< AvailabilitySlot
Booking >── Listing, >── User(angler), >── AvailabilitySlot
Booking ──< Payment ──< Payout
Booking ──1 Review
User ──< Message (thread keyed by Booking/Inquiry)
Listing ──< Photo (S3 ref)
User ──< KYC/VerificationRecord
Booking ──< DisputeCase
```

Key invariants: a `Booking` is the spine — payments, messages, reviews, and disputes all hang off it. An `AvailabilitySlot` can map to at most one `confirmed` booking.

---

## 6. Critical flow — search → book → pay → payout

1. **Search.** Angler queries by location/species/date → gateway → search service → Elasticsearch (geo + facets) → ranking applied → results (cached in Redis).
2. **View listing.** Listing service serves profile + live availability (Postgres, Redis-cached).
3. **Inquiry / hold.** Angler selects a slot → booking service places a Redis hold (TTL) → optional pre-booking message thread opens.
4. **Pay.** Payment service tokenizes card via PSP → captures deposit or full amount → idempotent write → booking moves to `pending` or `confirmed` per captain's instant-book setting.
5. **Confirm.** If captain approval required, captain accepts in dashboard → slot locked in Postgres → confirmation email/SMS to both parties (async).
6. **Trip happens.** State → `completed` (auto on date + grace period, or captain-marked).
7. **Payout.** Payout service releases captain funds minus commission, after the dispute window, via PSP multi-party payout.
8. **Review.** Verified-booking review unlocked; review service gates and publishes; feeds back into ranking signals.

Every side-effectful step is idempotent and event-emitting; failures retry without double-charging or double-booking.

---

## 7. Security & compliance

- **PCI DSS:** stay out of scope by never touching raw card data — PSP tokenization only.
- **Data protection (GDPR-class):** consent, data export/erasure, minimal PII retention. Relevant given EU operations.
- **Secrets management:** vault/parameter store, key rotation (no keys in code).
- **AuthZ:** strict role separation; captains see only their data, admins gated by permission scopes; full audit logging on money and moderation actions.
- **Abuse controls:** WAF, rate limiting, bot detection, anomaly detection on auth and payment endpoints.

---

## 8. Scaling path (don't over-build on day one)

| Stage | Architecture | Trigger to evolve |
|---|---|---|
| **MVP** | Modular monolith (Postgres + Redis + S3 + one search index), SSR frontend, single PSP | Launch |
| **Growth** | Read replicas, CDN-cached SSR pages, async workers split out, dedicated search cluster | Traffic + SEO page count rising |
| **Scale** | Extract high-load domains (search, payments, messaging) into services; event bus backbone; multi-region read | GMV and concurrency pressure |

Resist premature microservices. A clean modular monolith with strong domain boundaries gets you remarkably far and is far cheaper to operate.

---

## 9. Reference stack (one viable, low-cost build)

- **Frontend:** Next.js (SSR/SSG for SEO) or Nuxt; Tailwind; map via Mapbox/Google Maps.
- **Backend:** Node.js (NestJS) or Python (Django/FastAPI) or Laravel — modular monolith.
- **Datastores:** PostgreSQL (PostGIS for geo), Elasticsearch/OpenSearch, Redis, S3-compatible storage.
- **Payments:** Stripe Connect (fastest path to marketplace payouts + KYC).
- **Async:** SQS or RabbitMQ + worker processes.
- **Infra:** AWS (ECS/Fargate or EC2), CloudFront, ALB, RDS, ElastiCache.
- **Observability:** ELK/OpenSearch + Grafana/Prometheus; Sentry for errors.
- **Email/SMS:** Postmark/SendGrid + Twilio.

---

## 10. Mapping to fish-x.com

If you're building a FishingBooker-style booking layer into fish-x.com, the high-leverage early decisions are:

1. **SSR + programmatic SEO from day one** — this is the growth moat, not a later optimization.
2. **Get the booking state machine and availability-locking right before anything else** — correctness here is the product.
3. **Use Stripe Connect** to avoid building escrow, KYC, and multi-party payouts yourself.
4. **Make ranking a tunable, logged scoring function**, not hardcoded sort order.
5. **Build trust & safety tooling early** — moderation, verified reviews, off-platform-leakage detection — because marketplace integrity compounds.
6. **Start as a modular monolith.** Split services only when a specific bottleneck forces it.

The lean vs. full-build tiers map cleanly onto Section 8: MVP = lean, Growth/Scale = full build.

---

*This is a reference architecture, not a disclosure of any company's private systems. Adapt boundaries and tooling to your team's strengths and budget.*
