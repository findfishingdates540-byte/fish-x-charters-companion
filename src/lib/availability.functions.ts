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
});

export const createServiceSlots = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => CreateInput.parse(i))
  .handler(async ({ data, context }) => {
    const rows = data.dates.map((d) => {
      const starts = new Date(`${d}T${data.startTime}:00.000Z`);
      const ends = new Date(starts.getTime() + data.durationMinutes * 60_000);
      return {
        service_id: data.serviceId,
        starts_at: starts.toISOString(),
        ends_at: ends.toISOString(),
        seats_available: data.seats,
        price_cents: data.priceCents ?? null,
        notes: data.notes ?? null,
        is_blackout: false,
      };
    });
    const { data: inserted, error } = await context.supabase
      .from("service_availability")
      .insert(rows)
      .select(SlotRow);
    if (error) throw new Response(error.message, { status: 400 });
    return inserted ?? [];
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
