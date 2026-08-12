/**
 * Ranking & discovery (deep spec Part 3).
 *
 * `rank_listings` is a weighted-sum scorer over `listing_metrics`
 * (quality, reliability, conversion, freshness) with a decaying cold-start
 * boost for new listings. Impressions and clicks are logged with their full
 * feature vector so the weights can be tuned empirically later.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabase } from "@/integrations/supabase/client";

export type RankedListing = {
  service_id: string;
  business_id: string;
  score: number;
  features: Record<string, string | number | boolean | null>;
};

/** Score published listings; safe for signed-out discovery too. */
export const getRankedListings = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z
      .object({
        city: z.string().nullable().optional(),
        kinds: z.array(z.string()).optional(),
        limit: z.number().int().min(1).max(100).optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabase.rpc("rank_listings", {
      _city: data.city ?? undefined,
      _kinds: data.kinds ?? undefined,
      _limit: data.limit ?? 24,
    });
    if (error) throw new Response(error.message, { status: 500 });
    return (rows ?? []) as RankedListing[];
  });

/** Log an impression / click / book event with its feature vector. */
export const logListingEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        serviceId: z.string().uuid(),
        kind: z.enum(["impression", "click", "book"]),
        position: z.number().int().nullable().optional(),
        query: z.record(z.string(), z.string()).optional(),
        features: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
        sessionId: z.string().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("log_listing_event", {
      _service_id: data.serviceId,
      _event_kind: data.kind,
      _position: data.position ?? undefined,
      _query: (data.query ?? {}) as never,
      _features: (data.features ?? {}) as never,
      _session_id: data.sessionId ?? undefined,
    });
    if (error) return { ok: false as const };
    return { ok: true as const };
  });
