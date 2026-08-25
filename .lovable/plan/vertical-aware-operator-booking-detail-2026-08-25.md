# Vertical-aware operator booking detail

## Problem (confirmed)

Every operator vertical (marina slips, lodging, guides, tackle services) opens booking rows through `/bookings/detail`, which renders the charter-only `CaptainBookingDetail`. Marina and lodging operators see fishing-trip language and controls that do not apply:

- "Trip day" / "Weather call" timeline steps
- "Weather cancel" rebooking flow
- Charter escrow narrative ("payout secured against trip completion")

The money logic itself is correct for all verticals; only the framing and the weather flow are charter-specific.

## Approach

Keep one detail route and one component, driven by the booking's service kind, instead of building a second page.

1. Derive a `vertical` value from `service.kind` in `CaptainBookingDetail`:
   - `charter_trip` / `guided_trip` -> charter
   - `marina_slip` -> slip
   - `lodging` -> stay
   - everything else -> generic booking
2. Move all user-facing strings into a small per-vertical copy map: noun ("trip", "slip reservation", "stay"), timeline step labels, escrow blurbs, and the completion button label.
3. Show the weather-cancel flow only for the charter vertical. Non-charter verticals get the standard cancel/refund controls that already exist.
4. Fee label stays "Fish-X fee" but reads the booking's stored `commission_rate` instead of the hardcoded 15%, so merchandise-style rates display correctly.
5. Header title and timeline headings use the vertical noun.

## Files

- `src/components/captain/CaptainBookingDetail.tsx` — vertical detection, copy map, conditional weather flow, rate-driven fee label
- No route or data changes; `OperatorBookings.tsx` and `MarinaDashboard.tsx` keep linking to `/bookings/detail`

## Verification

Open a charter booking (unchanged experience) and a marina reservation (slip wording, no weather flow) from the operator dashboards.
