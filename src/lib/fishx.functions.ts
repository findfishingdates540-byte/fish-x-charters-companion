/**
 * Fish-X bridge — server functions (client-safe module).
 *
 * These wrap the server-only HMAC helper in `fishx-api.server.ts` so
 * components can call them via useServerFn without ever seeing the secret.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const sponsoredInput = z.object({
  businessId: z.string().uuid(),
  title: z.string().min(3),
  species: z.string().optional(),
  startsAt: z.string(),
  endsAt: z.string(),
  prizeValueCents: z.number().int().nonnegative(),
  regionJson: z.record(z.string(), z.any()).optional(),
});

export const createSponsoredChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => sponsoredInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: allowed } = await supabase.rpc("is_business_member", {
      _business_id: data.businessId,
      _user_id: userId,
      _min_role: "manager",
    });
    if (!allowed) throw new Response("Forbidden", { status: 403 });

    const { fishxFetch } = await import("./fishx-api.server");
    const remote = await fishxFetch<{ challenge_id: string }>(
      "/functions/v1/challenges-create-sponsored",
      {
        method: "POST",
        body: {
          charters_business_id: data.businessId,
          title: data.title,
          species: data.species,
          starts_at: data.startsAt,
          ends_at: data.endsAt,
          prize_cents: data.prizeValueCents,
          region: data.regionJson,
        },
      },
    ).catch(() => null);

    const { data: row, error } = await supabase
      .from("sponsored_challenges")
      .insert({
        business_id: data.businessId,
        title: data.title,
        species: data.species,
        starts_at: data.startsAt,
        ends_at: data.endsAt,
        prize_value_cents: data.prizeValueCents,
        region_json: data.regionJson,
        status: remote ? "signed" : "draft",
        fishx_challenge_id: remote?.challenge_id ?? null,
        signed_at: remote ? new Date().toISOString() : null,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw new Response(error.message, { status: 400 });
    return row;
  });

export const linkAnglerByEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { email: string }) => ({
    email: z.string().email().parse(input.email),
  }))
  .handler(async ({ data }) => {
    const { fishxFetch } = await import("./fishx-api.server");
    return fishxFetch<{ fishx_user_id: string | null }>(
      `/functions/v1/angler-lookup?q=${encodeURIComponent(data.email)}`,
    ).catch(() => ({ fishx_user_id: null }));
  });
