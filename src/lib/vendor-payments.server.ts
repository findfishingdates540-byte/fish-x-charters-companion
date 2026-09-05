/**
 * Server-only guard: a vendor can only sell once their Stripe Connect account
 * can actually receive money. Without this, a buyer's card is charged to the
 * platform and the payout transfer silently fails later.
 *
 * Never import from client-reachable module scope — load inside a handler.
 */
type MinimalClient = {
  from: (table: string) => any;
};

export type VendorPayoutStatus = {
  businessId: string;
  name: string;
  ready: boolean;
  reason: string | null;
};

/**
 * Reads live-ish readiness from `businesses`, refreshing it from Stripe when a
 * connected account exists but the cached flags say it isn't ready yet.
 */
export async function checkVendorsPayable(
  client: MinimalClient,
  businessIds: string[],
): Promise<VendorPayoutStatus[]> {
  const ids = [...new Set(businessIds)].filter(Boolean);
  if (!ids.length) return [];

  const { data: rows } = await client
    .from("businesses")
    .select("id,name,stripe_account_id,charges_enabled,payouts_enabled")
    .in("id", ids);

  const { getStripe } = await import("./stripe.server");
  const stripe = getStripe();

  const out: VendorPayoutStatus[] = [];
  for (const b of (rows ?? []) as Array<{
    id: string;
    name: string | null;
    stripe_account_id: string | null;
    charges_enabled: boolean | null;
    payouts_enabled: boolean | null;
  }>) {
    const name = b.name ?? "This seller";
    if (!b.stripe_account_id) {
      out.push({
        businessId: b.id,
        name,
        ready: false,
        reason: `${name} hasn't finished payment setup yet, so they can't take orders.`,
      });
      continue;
    }

    let charges = Boolean(b.charges_enabled);
    let payouts = Boolean(b.payouts_enabled);

    // Cached flags can lag behind onboarding — re-check with Stripe before we
    // turn a real buyer away.
    if ((!charges || !payouts) && stripe) {
      try {
        const acct = await stripe.accounts.retrieve(b.stripe_account_id);
        charges = acct.charges_enabled;
        payouts = acct.payouts_enabled;
        await client
          .from("businesses")
          .update({ charges_enabled: charges, payouts_enabled: payouts })
          .eq("id", b.id);
      } catch (err) {
        console.error(`[stripe] account lookup failed for ${b.id}`, err);
      }
    }

    out.push({
      businessId: b.id,
      name,
      ready: charges && payouts,
      reason:
        charges && payouts
          ? null
          : `${name} is still completing payment verification, so they can't take orders yet.`,
    });
  }

  // Any id we couldn't read at all is treated as not payable.
  for (const id of ids) {
    if (!out.some((r) => r.businessId === id)) {
      out.push({
        businessId: id,
        name: "This seller",
        ready: false,
        reason: "This seller is not accepting payments right now.",
      });
    }
  }
  return out;
}

/** Throws a 409 with a buyer-friendly message when any vendor can't be paid. */
export async function assertVendorsPayable(client: MinimalClient, businessIds: string[]) {
  const statuses = await checkVendorsPayable(client, businessIds);
  const blocked = statuses.filter((s) => !s.ready);
  if (blocked.length) {
    throw new Error(blocked.map((b) => b.reason).join(" "));
  }
}
