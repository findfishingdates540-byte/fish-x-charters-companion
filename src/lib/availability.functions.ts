/**
 * Slot inventory (`service_availability`) — the supply side of the booking
 * spine. Operators publish dated slots with a seat count; anglers can only
 * book a published, non-blackout slot with seats left.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SlotRow =
  "id,service_id,starts_at,ends_at,seats_available,seats_booked,price_cents,is_blackout,notes";

/** Operator view — every slot for one of the caller's services. */
export const listServiceSlots = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ serviceId: z.string().uuid(), from: z.string().optional() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const from = data.from ?? new Date(Date.now() - 7 * 86400_000).toISOString();
    const { data: rows, error } = await context.supabase
      .from("service_availability")
      .select(SlotRow)
      .eq("service_id", data.serviceId)
      .gte("starts_at", from)
      .order("starts_at", { ascending: true })
      .limit(400);
    if (error) throw new Response(error.message, { status: 500 });
    return rows ?? [];
  });

/** Angler view — bookable slots only (future, open seats, not blacked out). */
export const listOpenSlots = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ serviceId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("service_availability")
      .select(SlotRow)
      .eq("service_id", data.serviceId)
      .eq("is_blackout", false)
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(120);
    if (error) throw new Response(error.message, { status: 500 });
    return (rows ?? []).filter((r) => (r.seats_available ?? 0) - (r.seats_booked ?? 0) > 0);
  });

const CreateInput = z.object({
  serviceId: z.string().uuid(),
  /** One or more ISO dates (yyyy-mm-dd). */
  dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1).max(90),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  durationMinutes: z.number().int().min(30).max(24 * 60),
  seats: z.number().int().min(1).max(200),
  priceCents: z.number().int().min(0).optional().nullable(),
  notes: z.string().max(300).optional().nullable(),
  /** When true, conflicting dates are skipped instead of failing the batch. */
  skipConflicts: z.boolean().optional(),
});

type Window = { date: string; starts: string; ends: string };

function windowsFor(dates: string[], startTime: string, durationMinutes: number): Window[] {
  return dates.map((d) => {
    const starts = new Date(`${d}T${startTime}:00.000Z`);
    const ends = new Date(starts.getTime() + durationMinutes * 60_000);
    return { date: d, starts: starts.toISOString(), ends: ends.toISOString() };
  });
}

/**
 * Existing slots that would overlap the proposed windows.
 *
 * Two levels of clash:
 *  - same listing: any overlapping departure (you can't publish twice).
 *  - sibling listings of the same operator: only *booked* overlapping
 *    departures matter — the boat/crew is already at sea in that time block,
 *    so a new departure there could never be honoured.
 */
async function findConflicts(
  supabase: any,
  serviceId: string,
  windows: Window[],
): Promise<{ date: string; reason: string }[]> {
  if (windows.length === 0) return [];
  const from = windows.reduce((a, w) => (w.starts < a ? w.starts : a), windows[0]!.starts);
  const to = windows.reduce((a, w) => (w.ends > a ? w.ends : a), windows[0]!.ends);
  const { data: existing } = await supabase
    .from("service_availability")
    .select("id,starts_at,ends_at,seats_booked,is_blackout")
    .eq("service_id", serviceId)
    .lt("starts_at", to)
    .gt("ends_at", from);

  const { data: svc } = await supabase
    .from("bookable_services")
    .select("business_id,kind")
    .eq("id", serviceId)
    .maybeSingle();

  let siblings: any[] = [];
  if (svc?.business_id) {
    const { data: rows } = await supabase
      .from("service_availability")
      .select("id,starts_at,ends_at,seats_booked,service:bookable_services!inner(id,business_id,title)")
      .eq("service.business_id", svc.business_id)
      .gt("seats_booked", 0)
      .lt("starts_at", to)
      .gt("ends_at", from);
    siblings = (rows ?? []).filter((r: any) => r.service?.id !== serviceId);
  }

  const out: { date: string; reason: string }[] = [];
  for (const w of windows) {
    const hit = (existing ?? []).find(
      (e: any) =>
        e.starts_at < w.ends &&
        e.ends_at > w.starts &&
        !(e.is_blackout && (e.seats_booked ?? 0) === 0),
    );
    if (hit) {
      out.push({
        date: w.date,
        reason:
          (hit.seats_booked ?? 0) > 0
            ? `already has ${hit.seats_booked} booked seat(s) at an overlapping time`
            : "overlaps a departure you already published",
      });
      continue;
    }
    const busy = siblings.find((e: any) => e.starts_at < w.ends && e.ends_at > w.starts);
    if (busy) {
      out.push({
        date: w.date,
        reason: `you're already booked out in that time block on "${busy.service?.title ?? "another listing"}"`,
      });
    }
  }
  return out;
}

/** Pre-flight check the UI can call before publishing. */
export const checkSlotConflicts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    CreateInput.pick({
      serviceId: true,
      dates: true,
      startTime: true,
      durationMinutes: true,
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const windows = windowsFor(data.dates, data.startTime, data.durationMinutes);
    return { conflicts: await findConflicts(context.supabase, data.serviceId, windows) };
  });

export const createServiceSlots = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => CreateInput.parse(i))
  .handler(async ({ data, context }) => {
    const windows = windowsFor(data.dates, data.startTime, data.durationMinutes);
    const conflicts = await findConflicts(context.supabase, data.serviceId, windows);

    if (conflicts.length > 0 && !data.skipConflicts) {
      throw new Response(
        `Can't publish — ${conflicts
          .map((c) => `${c.date} ${c.reason}`)
          .join("; ")}. Adjust the time or skip those dates.`,
        { status: 409 },
      );
    }

    const blocked = new Set(conflicts.map((c) => c.date));
    const rows = windows
      .filter((w) => !blocked.has(w.date))
      .map((w) => ({
        service_id: data.serviceId,
        starts_at: w.starts,
        ends_at: w.ends,
        seats_available: data.seats,
        price_cents: data.priceCents ?? null,
        notes: data.notes ?? null,
        is_blackout: false,
      }));

    if (rows.length === 0) return { created: [], skipped: conflicts };

    const { data: inserted, error } = await context.supabase
      .from("service_availability")
      .insert(rows)
      .select(SlotRow);
    if (error) throw new Response(error.message, { status: 400 });
    return { created: inserted ?? [], skipped: conflicts };
  });

export const updateServiceSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        slotId: z.string().uuid(),
        seats: z.number().int().min(1).max(200).optional(),
        priceCents: z.number().int().min(0).nullable().optional(),
        isBlackout: z.boolean().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: slot } = await context.supabase
      .from("service_availability")
      .select("seats_booked,seats_available")
      .eq("id", data.slotId)
      .maybeSingle();
    const booked = slot?.seats_booked ?? 0;

    if (typeof data.seats === "number" && data.seats < booked) {
      throw new Response(
        `Can't drop to ${data.seats} seat(s) — ${booked} are already booked on this departure.`,
        { status: 409 },
      );
    }
    if (data.isBlackout === true && booked > 0) {
      throw new Response(
        `Can't block this departure — ${booked} seat(s) are already booked. Cancel those bookings first.`,
        { status: 409 },
      );
    }

    const patch = {
      ...(typeof data.seats === "number" ? { seats_available: data.seats } : {}),
      ...(data.priceCents !== undefined ? { price_cents: data.priceCents } : {}),
      ...(typeof data.isBlackout === "boolean" ? { is_blackout: data.isBlackout } : {}),
    };
    const { error } = await context.supabase
      .from("service_availability")
      .update(patch)
      .eq("id", data.slotId);
    if (error) throw new Response(error.message, { status: 400 });
    return { ok: true };
  });

/** Only removable while nobody has booked into it. */
export const deleteServiceSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ slotId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: slot } = await context.supabase
      .from("service_availability")
      .select("seats_booked")
      .eq("id", data.slotId)
      .maybeSingle();
    if ((slot?.seats_booked ?? 0) > 0) {
      throw new Response("This slot already has bookings — block it instead of deleting.", {
        status: 400,
      });
    }
    const { error } = await context.supabase
      .from("service_availability")
      .delete()
      .eq("id", data.slotId);
    if (error) throw new Response(error.message, { status: 400 });
    return { ok: true };
  });

/* ------------------------------------------------------------------ *
 * Adjusting FUTURE published availability with an explicit policy.
 *
 * `keep`    — never touch a day that already has published departures.
 * `replace` — republish the day at the new time/seats/price, but any
 *             departure with booked seats is preserved (never cancelled);
 *             it is repriced/resized in place when that is safe.
 * ------------------------------------------------------------------ */

const AdjustInput = CreateInput.omit({ skipConflicts: true }).extend({
  mode: z.enum(["keep", "replace"]),
});

type DayPlan = {
  date: string;
  action: "create" | "replace" | "keep" | "skip";
  existingSlots: number;
  bookedSeats: number;
  seatsBefore: number;
  seatsAfter: number;
  detail: string;
};

async function planAdjustment(
  supabase: any,
  data: z.infer<typeof AdjustInput>,
): Promise<{ plan: DayPlan[]; windows: Window[] }> {
  const windows = windowsFor(data.dates, data.startTime, data.durationMinutes);
  const dayStart = `${data.dates.slice().sort()[0]}T00:00:00.000Z`;
  const lastDate = data.dates.slice().sort().at(-1)!;
  const dayEnd = new Date(new Date(`${lastDate}T00:00:00.000Z`).getTime() + 2 * 86400_000).toISOString();

  const { data: existing } = await supabase
    .from("service_availability")
    .select("id,starts_at,ends_at,seats_available,seats_booked,is_blackout,price_cents")
    .eq("service_id", data.serviceId)
    .gte("starts_at", dayStart)
    .lt("starts_at", dayEnd);

  const nowIso = new Date().toISOString();
  const plan: DayPlan[] = windows.map((w) => {
    const same = (existing ?? []).filter((e: any) => e.starts_at.slice(0, 10) === w.date);
    const booked = same.reduce((n: number, e: any) => n + (e.seats_booked ?? 0), 0);
    const seatsBefore = same.reduce((n: number, e: any) => n + (e.seats_available ?? 0), 0);
    const isPast = w.starts < nowIso;

    if (isPast)
      return {
        date: w.date,
        action: "skip",
        existingSlots: same.length,
        bookedSeats: booked,
        seatsBefore,
        seatsAfter: seatsBefore,
        detail: "in the past — left alone",
      };
    if (same.length === 0)
      return {
        date: w.date,
        action: "create",
        existingSlots: 0,
        bookedSeats: 0,
        seatsBefore: 0,
        seatsAfter: data.seats,
        detail: `new departure at ${data.startTime} · ${data.seats} seats`,
      };
    if (data.mode === "keep")
      return {
        date: w.date,
        action: "keep",
        existingSlots: same.length,
        bookedSeats: booked,
        seatsBefore,
        seatsAfter: seatsBefore,
        detail: booked
          ? `left as-is — ${booked} booked seat(s)`
          : "left as-is — already published",
      };

    // replace
    const bookedSlots = same.filter((e: any) => (e.seats_booked ?? 0) > 0);
    const clearSlots = same.filter((e: any) => (e.seats_booked ?? 0) === 0);
    const keptSeats = bookedSlots.reduce(
      (n: number, e: any) => n + Math.max(data.seats, e.seats_booked ?? 0),
      0,
    );
    return {
      date: w.date,
      action: "replace",
      existingSlots: same.length,
      bookedSeats: booked,
      seatsBefore,
      seatsAfter: bookedSlots.length ? keptSeats : data.seats,
      detail: bookedSlots.length
        ? `${bookedSlots.length} booked departure(s) kept and updated${
            clearSlots.length ? `, ${clearSlots.length} empty one(s) replaced` : ""
          }`
        : `republished at ${data.startTime} · ${data.seats} seats`,
    };
  });

  return { plan, windows };
}

function summarise(plan: DayPlan[], seats: number) {
  const created = plan.filter((p) => p.action === "create").length;
  const replaced = plan.filter((p) => p.action === "replace").length;
  const kept = plan.filter((p) => p.action === "keep").length;
  const skipped = plan.filter((p) => p.action === "skip").length;
  const bookingsTouched = plan
    .filter((p) => p.action === "replace")
    .reduce((n, p) => n + p.bookedSeats, 0);
  const seatDelta = plan.reduce((n, p) => n + (p.seatsAfter - p.seatsBefore), 0);
  const parts: string[] = [];
  if (created) parts.push(`${created} new day${created === 1 ? "" : "s"} published at ${seats} seats`);
  if (replaced) parts.push(`${replaced} day${replaced === 1 ? "" : "s"} republished`);
  if (kept) parts.push(`${kept} day${kept === 1 ? "" : "s"} left untouched`);
  if (skipped) parts.push(`${skipped} past day${skipped === 1 ? "" : "s"} ignored`);
  parts.push(
    bookingsTouched
      ? `${bookingsTouched} booked seat(s) preserved — no angler loses a trip`
      : "no existing bookings affected",
  );
  if (seatDelta !== 0)
    parts.push(`${seatDelta > 0 ? "+" : ""}${seatDelta} bookable seat${Math.abs(seatDelta) === 1 ? "" : "s"} overall`);
  return {
    created,
    replaced,
    kept,
    skipped,
    bookingsTouched,
    seatDelta,
    headline: parts.join(" · "),
  };
}

/** Dry run — what would happen if this policy were applied. */
export const previewAvailabilityAdjustment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => AdjustInput.parse(i))
  .handler(async ({ data, context }) => {
    const { plan } = await planAdjustment(context.supabase, data);
    return { plan, summary: summarise(plan, data.seats) };
  });

/** Apply the adjustment. Booked departures are never deleted. */
export const applyAvailabilityAdjustment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => AdjustInput.parse(i))
  .handler(async ({ data, context }) => {
    const { plan, windows } = await planAdjustment(context.supabase, data);
    const priceCents = data.priceCents ?? null;
    const byDate = new Map(windows.map((w) => [w.date, w]));

    const toInsert: any[] = [];
    for (const p of plan) {
      const w = byDate.get(p.date)!;
      if (p.action === "create") {
        toInsert.push({
          service_id: data.serviceId,
          starts_at: w.starts,
          ends_at: w.ends,
          seats_available: data.seats,
          price_cents: priceCents,
          notes: data.notes ?? null,
          is_blackout: false,
        });
        continue;
      }
      if (p.action !== "replace") continue;

      const { data: same } = await context.supabase
        .from("service_availability")
        .select("id,seats_booked,seats_available")
        .eq("service_id", data.serviceId)
        .gte("starts_at", `${p.date}T00:00:00.000Z`)
        .lt("starts_at", `${p.date}T23:59:59.999Z`);

      const booked = (same ?? []).filter((s: any) => (s.seats_booked ?? 0) > 0);
      const clear = (same ?? []).filter((s: any) => (s.seats_booked ?? 0) === 0);

      // Keep booked departures — just resize/reprice them safely.
      for (const s of booked) {
        const seats = Math.max(data.seats, s.seats_booked ?? 0);
        const { error } = await context.supabase
          .from("service_availability")
          .update({ seats_available: seats, price_cents: priceCents, is_blackout: false })
          .eq("id", s.id);
        if (error) throw new Response(error.message, { status: 400 });
      }
      // Empty departures can be swapped out for the new window.
      if (clear.length > 0) {
        const { error } = await context.supabase
          .from("service_availability")
          .delete()
          .in(
            "id",
            clear.map((s: any) => s.id),
          );
        if (error) throw new Response(error.message, { status: 400 });
      }
      if (booked.length === 0) {
        toInsert.push({
          service_id: data.serviceId,
          starts_at: w.starts,
          ends_at: w.ends,
          seats_available: data.seats,
          price_cents: priceCents,
          notes: data.notes ?? null,
          is_blackout: false,
        });
      }
    }

    if (toInsert.length > 0) {
      const { error } = await context.supabase.from("service_availability").insert(toInsert);
      if (error) throw new Response(error.message, { status: 400 });
    }
    return { plan, summary: summarise(plan, data.seats) };
  });



/** Listing-level booking rules: instant book, accept window, cancellation policy. */
export const updateServiceBookingRules = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        serviceId: z.string().uuid(),
        instantBook: z.boolean().optional(),
        acceptWindowHours: z.number().int().min(1).max(120).optional(),
        cancellationPolicy: z.enum(["flexible", "moderate", "strict"]).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const patch = {
      ...(typeof data.instantBook === "boolean" ? { instant_book: data.instantBook } : {}),
      ...(data.acceptWindowHours ? { accept_window_hours: data.acceptWindowHours } : {}),
      ...(data.cancellationPolicy ? { cancellation_policy: data.cancellationPolicy } : {}),
    };
    const { error } = await context.supabase
      .from("bookable_services")
      .update(patch)
      .eq("id", data.serviceId);
    if (error) throw new Response(error.message, { status: 400 });
    return { ok: true };
  });
