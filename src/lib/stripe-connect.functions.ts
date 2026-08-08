/**
 * Stripe Connect onboarding for service providers (captains, guides, marinas,
 * tackle shops, manufacturers, apparel brands).
 *
 * Uses Express accounts: the operator onboards on Stripe-hosted pages, then
 * `charges_enabled` / `payouts_enabled` are synced back onto `businesses`.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function ownedBusiness(supabase: any, userId: string, businessId?: string) {
  const q = supabase
    .from("business_members")
    .select("business_id, role, business:businesses(*)")
    .eq("user_id", userId)
    .in("role", ["owner", "manager"]);
  const { data, error } = businessId ? await q.eq("business_id", businessId) : await q;
  if (error) throw new Response(error.message, { status: 500 });
  const row = (data ?? [])[0];
  if (!row?.business) throw new Response("No business found for this account", { status: 400 });
  return row.business;
}

export const getConnectStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ businessId: z.string().uuid().optional() }).parse(i ?? {}))
  .handler(async ({ data, context }) => {
    const biz = await ownedBusiness(context.supabase, context.userId, data.businessId);
    const { getStripe } = await import("./stripe.server");
    const stripe = getStripe();

    let chargesEnabled = biz.charges_enabled ?? false;
    let payoutsEnabled = biz.payouts_enabled ?? false;
    let requirementsDue: string[] = [];

    if (stripe && biz.stripe_account_id) {
      try {
        const acct = await stripe.accounts.retrieve(biz.stripe_account_id);
        chargesEnabled = acct.charges_enabled;
        payoutsEnabled = acct.payouts_enabled;
        requirementsDue = acct.requirements?.currently_due ?? [];
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin
          .from("businesses")
          .update({
            charges_enabled: chargesEnabled,
            payouts_enabled: payoutsEnabled,
            onboarding_completed_at:
              chargesEnabled && payoutsEnabled ? new Date().toISOString() : biz.onboarding_completed_at,
          })
          .eq("id", biz.id);
      } catch (err) {
        console.error("[stripe] account retrieve failed", err);
      }
    }

    return {
      businessId: biz.id as string,
      businessName: biz.name as string,
      stripeConfigured: Boolean(stripe),
      stripeAccountId: (biz.stripe_account_id as string | null) ?? null,
      chargesEnabled,
      payoutsEnabled,
      requirementsDue,
      commissionRate: Number(biz.commission_rate ?? 0.2),
    };
  });

// GET on purpose: some hosting layers (Netlify/CDN redirects) downgrade POST
// to GET on /_serverFn/*, which surfaces as "Expected POST. Got GET".
export const createConnectOnboardingLink = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({ businessId: z.string().uuid().optional(), returnUrl: z.string().url() })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const biz = await ownedBusiness(context.supabase, context.userId, data.businessId);
    const { requireStripe } = await import("./stripe.server");
    const stripe = requireStripe();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let accountId = biz.stripe_account_id as string | null;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: biz.email ?? undefined,
        business_profile: {
          name: biz.name,
          url: biz.website ?? undefined,
        },
        metadata: { business_id: biz.id },
        capabilities: {
          transfers: { requested: true },
        },
      });
      accountId = account.id;
      const { error } = await supabaseAdmin
        .from("businesses")
        .update({ stripe_account_id: accountId, stripe_account_type: "express" })
        .eq("id", biz.id);
      if (error) throw new Response(error.message, { status: 500 });
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: data.returnUrl,
      return_url: data.returnUrl,
      type: "account_onboarding",
    });

    return { url: link.url, accountId };
  });

/** Express dashboard link so operators can see their balance and payouts. */
export const createConnectDashboardLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ businessId: z.string().uuid().optional() }).parse(i ?? {}))
  .handler(async ({ data, context }) => {
    const biz = await ownedBusiness(context.supabase, context.userId, data.businessId);
    if (!biz.stripe_account_id) throw new Response("Connect your payout account first", { status: 400 });
    const { requireStripe } = await import("./stripe.server");
    const login = await requireStripe().accounts.createLoginLink(biz.stripe_account_id);
    return { url: login.url };
  });
