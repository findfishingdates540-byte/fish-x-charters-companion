/**
 * Default availability seeding.
 *
 * A freshly published listing has no dated slots, so the public booking
 * calendar renders every day as unbookable. When an operator publishes a
 * listing we release a default rolling schedule (one departure per day for the
 * next N days) so anglers can book immediately. Operators can always edit,
 * blackout or replace these from the availability calendar in their dashboard.
 *
 * In the charter-parent model, departure patterns live on the charter
 * (charter_departure_times). This function is called per-package (bookable_service),
 * receiving the charter's active departure patterns.
 */

const DEFAULT_DAYS = 90;
/** 07:00 UTC ≈ early-morning local departure across US fishing coasts. */
const DEFAULT_START_HOUR_UTC = 7;

export type SeedableService = {
  id: string;
  capacity: number | null;
  duration_minutes: number | null;
  base_price_cents: number | null;
};

export type DeparturePattern = {
  label: string | null;
  start_time: string; // "HH:MM" or "HH:MM:SS"
  days_of_week: number[]; // 0=Sun..6=Sat, e.g. [1,2,3,4,5]=Mon-Fri
  is_active: boolean;
  sort_order: number;
};

/**
 * Releases a rolling default schedule when the listing has no future slots.
 * Returns the number of slots created (0 when the operator already published
 * their own availability).
 */
export async function ensureFutureAvailability(
  supabase: any,
  service: SeedableService,
  days: number = DEFAULT_DAYS,
  departurePatterns: DeparturePattern[] = [],
): Promise<number> {
  const nowIso = new Date().toISOString();

  // If the service has active departure templates, use those to materialise
  // availability slots. Otherwise fall back to the original single-07:00 logic.
  const hasActivePatterns = departurePatterns.some((p) => p.is_active && p.days_of_week.length > 0);

  if (hasActivePatterns) {
    // 1) Remove future departure_template slots that are no longer valid
    //    (seats_booked = 0, and the date/start_time no longer matches any active pattern).
    //    We NEVER touch source='manual' or booked slots.
    await pruneObsoleteTemplateSlots(supabase, service.id, nowIso, departurePatterns);

    // 2) Insert missing departure_template slots for the next N days
    return await insertMissingTemplateSlots(supabase, service, days, departurePatterns, nowIso);
  }

  // --- FALLBACK: original single-07:00 default ---
  const { count, error: countError } = await supabase
    .from("service_availability")
    .select("id", { count: "exact", head: true })
    .eq("service_id", service.id)
    .gte("starts_at", nowIso);
  if (countError) return 0;
  if ((count ?? 0) > 0) return 0;

  const duration = Math.min(Math.max(service.duration_minutes ?? 480, 30), 24 * 60);
  const seats = Math.min(Math.max(service.capacity ?? 4, 1), 200);
  const price = service.base_price_cents ?? null;

  const rows: Record<string, unknown>[] = [];
  const base = new Date();
  for (let i = 1; i <= days; i++) {
    const day = new Date(
      Date.UTC(
        base.getUTCFullYear(),
        base.getUTCMonth(),
        base.getUTCDate() + i,
        DEFAULT_START_HOUR_UTC,
        0,
        0,
        0,
      ),
    );
    rows.push({
      service_id: service.id,
      starts_at: day.toISOString(),
      ends_at: new Date(day.getTime() + duration * 60_000).toISOString(),
      seats_available: seats,
      seats_booked: 0,
      is_blackout: false,
      price_cents: price,
      source: "departure_template",
      notes: "Auto-released schedule — edit any day from your availability calendar.",
    });
  }

  let created = 0;
  for (let i = 0; i < rows.length; i += 45) {
    const chunk = rows.slice(i, i + 45);
    const { error } = await supabase.from("service_availability").insert(chunk);
    if (!error) created += chunk.length;
  }
  return created;
}

/**
 * Delete future departure_template slots with seats_booked = 0 that no longer
 * match any active departure pattern.
 */
async function pruneObsoleteTemplateSlots(
  supabase: any,
  serviceId: string,
  nowIso: string,
  patterns: DeparturePattern[],
): Promise<void> {
  const activePatterns = patterns.filter((p) => p.is_active && p.days_of_week.length > 0);
  if (activePatterns.length === 0) return;

  // Fetch future template slots for this service.
  const { data: slots, error } = await supabase
    .from("service_availability")
    .select("id,starts_at,seats_booked")
    .eq("service_id", serviceId)
    .eq("source", "departure_template")
    .eq("seats_booked", 0)
    .gte("starts_at", nowIso);

  if (error || !slots?.length) return;

  const toDelete: string[] = [];
  for (const slot of slots) {
    const dt = new Date(slot.starts_at);
    const weekday = dt.getUTCDay(); // 0=Sun..6=Sat
    const timeStr = dt.toTimeString().slice(0, 5); // "HH:MM" UTC

    // Check if this slot matches any active pattern.
    // NOTE: timezone-accurate instants deferred — patterns are stored as
    // local wall-clock times (e.g. "07:00"). The UTC instant we generate
    // matches the pattern only if the server's clock/zone aligns with
    // the operator's. A future `businesses.timezone` + `AT TIME ZONE` pass
    // can make this exact.
    const matches = activePatterns.some((p) =>
      p.days_of_week.includes(weekday) && p.start_time.slice(0, 5) === timeStr,
    );

    if (!matches) toDelete.push(slot.id);
  }

  if (toDelete.length) {
    await supabase.from("service_availability").delete().in("id", toDelete);
  }
}

/**
 * Insert missing departure_template slots for the next N days.
 * For each day, for each active pattern whose days_of_week includes the
 * weekday, insert a slot at the pattern's start_time (interpreted as UTC
 * wall-clock — see timezone note above).
 */
async function insertMissingTemplateSlots(
  supabase: any,
  service: SeedableService,
  days: number,
  patterns: DeparturePattern[],
  nowIso: string,
): Promise<number> {
  const activePatterns = patterns.filter((p) => p.is_active && p.days_of_week.length > 0);
  if (activePatterns.length === 0) return 0;

  const duration = Math.min(Math.max(service.duration_minutes ?? 480, 30), 24 * 60);
  const seats = Math.min(Math.max(service.capacity ?? 4, 1), 200);
  const price = service.base_price_cents ?? null;

  // Collect all existing starts_at for this service (template + manual) so
  // we don't duplicate.
  const { data: existing, error: existErr } = await supabase
    .from("service_availability")
    .select("starts_at")
    .eq("service_id", service.id)
    .gte("starts_at", nowIso);
  if (existErr) return 0;

  const existingStarts = new Set((existing ?? []).map((s: { starts_at: string }) => s.starts_at));

  const base = new Date();
  const rows: Record<string, unknown>[] = [];

  for (let i = 1; i <= days; i++) {
    const day = new Date(
      Date.UTC(
        base.getUTCFullYear(),
        base.getUTCMonth(),
        base.getUTCDate() + i,
        0,
        0,
        0,
        0,
      ),
    );
    const weekday = day.getUTCDay();

    for (const pattern of activePatterns) {
      if (!pattern.days_of_week.includes(weekday)) continue;

      const [hh, mm] = pattern.start_time.split(":").map(Number);
      const startsAt = new Date(day);
      startsAt.setUTCHours(hh, mm, 0, 0);
      const startsIso = startsAt.toISOString();

      if (existingStarts.has(startsIso)) continue;

      rows.push({
        service_id: service.id,
        starts_at: startsIso,
        ends_at: new Date(startsAt.getTime() + duration * 60_000).toISOString(),
        seats_available: seats,
        seats_booked: 0,
        is_blackout: false,
        price_cents: price,
        source: "departure_template",
        notes: pattern.label ? `Template: ${pattern.label}` : "From recurring departure template",
      });
    }
  }

  let created = 0;
  for (let i = 0; i < rows.length; i += 45) {
    const chunk = rows.slice(i, i + 45);
    const { error } = await supabase.from("service_availability").insert(chunk);
    if (!error) created += chunk.length;
  }
  return created;
}
