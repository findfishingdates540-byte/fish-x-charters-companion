/**
 * Default availability seeding.
 *
 * A freshly published listing has no dated slots, so the public booking
 * calendar renders every day as unbookable. When an operator publishes a
 * listing we release a default rolling schedule (one departure per day for the
 * next N days) so anglers can book immediately. Operators can always edit,
 * blackout or replace these from the availability calendar in their dashboard.
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

/**
 * Releases a rolling default schedule when the listing has no future slots.
 * Returns the number of slots created (0 when the operator already published
 * their own availability).
 */
export async function ensureFutureAvailability(
  supabase: any,
  service: SeedableService,
  days: number = DEFAULT_DAYS,
): Promise<number> {
  const nowIso = new Date().toISOString();
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
