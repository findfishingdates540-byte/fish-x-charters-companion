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

/** Existing slots that would overlap the proposed windows. */
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
