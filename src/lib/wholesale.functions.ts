/**
 * Wholesale / trade selling: MOQ, case pack, tiered price breaks,
 * trade-account approval, and per-variant SKU + stock.
 *
 * Trade pricing is never readable by signed-out visitors (no anon grants),
 * and is only returned to approved trade buyers or the brand's own staff.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertMember(
  ctx: { supabase: any; userId: string },
  businessId: string,
) {
  const { data, error } = await ctx.supabase.rpc("is_business_member", {
    _business_id: businessId,
    _user_id: ctx.userId,
    _min_role: "staff",
  });
  if (error) throw new Response(error.message, { status: 500 });
  if (!data) throw new Response("Forbidden", { status: 403 });
}

/* --------------------------- Brand side --------------------------- */

export const getTradeCatalog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { businessId: string }) =>
    z.object({ businessId: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertMember(context, data.businessId);
    const { supabase } = context;
    const [settings, tiers, variants, accounts] = await Promise.all([
      supabase.from("product_wholesale_settings").select("*").eq("business_id", data.businessId),
      supabase
        .from("product_price_tiers")
        .select("*")
        .eq("business_id", data.businessId)
        .order("min_qty"),
      supabase
        .from("product_variants")
        .select("*")
        .eq("business_id", data.businessId)
        .order("sort_order"),
      supabase
        .from("trade_accounts")
        .select("*")
        .eq("business_id", data.businessId)
        .order("created_at", { ascending: false }),
    ]);
    return {
      settings: settings.data ?? [],
      tiers: tiers.data ?? [],
      variants: variants.data ?? [],
      accounts: accounts.data ?? [],
    };
  });

export const saveWholesaleSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        businessId: z.string().uuid(),
        productId: z.string().uuid(),
        minOrderQty: z.number().int().min(1).max(100000),
        casePack: z.number().int().min(1).max(100000),
        wholesaleOnly: z.boolean(),
        wholesalePriceCents: z.number().int().min(0).nullable().optional(),
        tiers: z
          .array(
            z.object({
              minQty: z.number().int().min(1).max(1000000),
              unitPriceCents: z.number().int().min(0),
            }),
          )
          .max(10)
          .optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertMember(context, data.businessId);
    const { supabase } = context;

    const { error } = await supabase.from("product_wholesale_settings").upsert(
      {
        product_id: data.productId,
        business_id: data.businessId,
        min_order_qty: data.minOrderQty,
        case_pack: data.casePack,
        wholesale_only: data.wholesaleOnly,
        wholesale_price_cents: data.wholesalePriceCents ?? null,
      },
      { onConflict: "product_id" },
    );
    if (error) throw new Response(error.message, { status: 400 });

    if (data.tiers) {
      await supabase.from("product_price_tiers").delete().eq("product_id", data.productId);
      if (data.tiers.length) {
        const { error: tErr } = await supabase.from("product_price_tiers").insert(
          data.tiers.map((t) => ({
            product_id: data.productId,
            business_id: data.businessId,
            min_qty: t.minQty,
            unit_price_cents: t.unitPriceCents,
          })),
        );
        if (tErr) throw new Response(tErr.message, { status: 400 });
      }
    }
    return { ok: true };
  });

export const saveVariants = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        businessId: z.string().uuid(),
        productId: z.string().uuid(),
        variants: z
          .array(
            z.object({
              id: z.string().uuid().optional(),
              optionName: z.string().min(1).max(40),
              optionValue: z.string().min(1).max(60),
              sku: z.string().max(60).optional(),
              priceDeltaCents: z.number().int(),
              stockQty: z.number().int().min(0),
            }),
          )
          .max(60),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertMember(context, data.businessId);
    const { supabase } = context;

    const { data: existing } = await supabase
      .from("product_variants")
      .select("id")
      .eq("product_id", data.productId);
    const keep = new Set(data.variants.map((v) => v.id).filter(Boolean));
    const toDelete = (existing ?? []).filter((r: any) => !keep.has(r.id)).map((r: any) => r.id);
    if (toDelete.length) {
      await supabase.from("product_variants").delete().in("id", toDelete);
    }

    for (const [idx, v] of data.variants.entries()) {
      const row = {
        product_id: data.productId,
        business_id: data.businessId,
        option_name: v.optionName,
        option_value: v.optionValue,
        sku: v.sku || null,
        price_delta_cents: v.priceDeltaCents,
        stock_qty: v.stockQty,
        sort_order: idx,
      };
      const q = v.id
        ? supabase.from("product_variants").update(row).eq("id", v.id)
        : supabase.from("product_variants").insert(row);
      const { error } = await q;
      if (error) throw new Response(error.message, { status: 400 });
    }
    return { ok: true };
  });

export const decideTradeAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        businessId: z.string().uuid(),
        id: z.string().uuid(),
        status: z.enum(["approved", "rejected", "pending"]),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertMember(context, data.businessId);
    const { error } = await context.supabase
      .from("trade_accounts")
      .update({
        status: data.status,
        decided_at: new Date().toISOString(),
        decided_by: context.userId,
      })
      .eq("id", data.id)
      .eq("business_id", data.businessId);
    if (error) throw new Response(error.message, { status: 400 });
    return { ok: true };
  });

/* --------------------------- Buyer side --------------------------- */

export const applyForTradeAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        businessId: z.string().uuid(),
        companyName: z.string().min(1).max(160),
        taxId: z.string().max(60).optional(),
        contactEmail: z.string().email().max(160).optional(),
        contactPhone: z.string().max(40).optional(),
        note: z.string().max(1000).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("trade_accounts").upsert(
      {
        business_id: data.businessId,
        buyer_id: context.userId,
        company_name: data.companyName,
        tax_id: data.taxId ?? null,
        contact_email: data.contactEmail ?? null,
        contact_phone: data.contactPhone ?? null,
        note: data.note ?? null,
        status: "pending",
      },
      { onConflict: "business_id,buyer_id" },
    );
    if (error) throw new Response(error.message, { status: 400 });
    return { ok: true };
  });

export type TradePricing = {
  status: "none" | "pending" | "approved" | "rejected";
  minOrderQty: number;
  casePack: number;
  wholesalePriceCents: number | null;
  tiers: { min_qty: number; unit_price_cents: number }[];
};

/** What the signed-in buyer may see for one product. */
export const getTradePricing = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { businessId: string; productId: string }) =>
    z
      .object({ businessId: z.string().uuid(), productId: z.string().uuid() })
      .parse(i),
  )
  .handler(async ({ data, context }): Promise<TradePricing> => {
    const { supabase } = context;
    const { data: account } = await supabase
      .from("trade_accounts")
      .select("status")
      .eq("business_id", data.businessId)
      .eq("buyer_id", context.userId)
      .maybeSingle();

    const status = (account?.status ?? "none") as TradePricing["status"];
    if (status !== "approved") {
      return { status, minOrderQty: 1, casePack: 1, wholesalePriceCents: null, tiers: [] };
    }

    const [{ data: settings }, { data: tiers }] = await Promise.all([
      supabase
        .from("product_wholesale_settings")
        .select("min_order_qty, case_pack, wholesale_price_cents")
        .eq("product_id", data.productId)
        .maybeSingle(),
      supabase
        .from("product_price_tiers")
        .select("min_qty, unit_price_cents")
        .eq("product_id", data.productId)
        .order("min_qty"),
    ]);

    return {
      status,
      minOrderQty: settings?.min_order_qty ?? 1,
      casePack: settings?.case_pack ?? 1,
      wholesalePriceCents: settings?.wholesale_price_cents ?? null,
      tiers: tiers ?? [],
    };
  });

/** Unit price for a quantity given trade pricing (break pricing wins). */
export function tradeUnitPrice(
  retailCents: number,
  pricing: TradePricing | null | undefined,
  qty: number,
): number {
  if (!pricing || pricing.status !== "approved") return retailCents;
  let price = pricing.wholesalePriceCents ?? retailCents;
  for (const t of pricing.tiers) {
    if (qty >= t.min_qty) price = t.unit_price_cents;
  }
  return price;
}
