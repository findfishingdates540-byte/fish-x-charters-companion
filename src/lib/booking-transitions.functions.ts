/**
 * Booking state-machine server functions.
 * Delegates authorization + atomic write + outbox emission to the
 * `transition_booking` RPC (SECURITY DEFINER) — this fn only shapes input.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

const BOOKING_STATUSES = [
  "inquiry",
  "pending_payment",
  "pending_confirmation",
  "confirmed",
  "in_progress",
  "completed",
  "reviewed",
  "declined",
  "expired",
  "cancelled_angler",
  "cancelled_captain",
  "no_show",
  "disputed",
  "refunded",
  "weather_cancelled",
] as const satisfies readonly BookingStatus[];

const InputSchema = z.object({
  bookingId: z.string().uuid(),
  toStatus: z.enum(BOOKING_STATUSES),
  reason: z.string().max(500).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const transitionBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.input<typeof InputSchema>) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: booking, error } = await context.supabase.rpc("transition_booking", {
      _booking_id: data.bookingId,
      _to_status: data.toStatus,
      _reason: data.reason ?? null,
      _metadata: (data.metadata ?? {}) as never,
    });
    if (error) {
      throw new Response(error.message, { status: 400 });
    }
    return booking;
  });
