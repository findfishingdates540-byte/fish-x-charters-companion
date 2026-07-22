/**
 * Tackle / gear / apparel dashboard server functions:
 * inventory CRUD, orders, KPIs.
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

export const getShopOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { businessId: string }) =>
    z.object({ businessId: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertMember(context, data.businessId);
    const { supabase } = context;

    const [{ data: products }, { data: orders }] = await Promise.all([
      supabase
        .from("inventory_products")
        .select(
          "id, sku, title, category, price_cents, stock_qty, low_stock_threshold, is_published, images",
        )
        .eq("business_id", data.businessId)
        .order("updated_at", { ascending: false }),
      supabase
        .from("product_orders")
        .select(
          "id, buyer_name, buyer_email, total_cents, status, created_at, items:product_order_items(id, title, quantity, unit_price_cents)",
        )
        .eq("business_id", data.businessId)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthGross =
      orders
        ?.filter(
          (o: any) =>
            o.status !== "cancelled" &&
            new Date(o.created_at) >= monthStart,
        )
        .reduce((acc: number, o: any) => acc + (o.total_cents ?? 0), 0) ?? 0;

    const toShip = orders?.filter((o: any) => o.status === "paid").length ?? 0;
    const shipped = orders?.filter((o: any) => o.status === "shipped").length ?? 0;
    const lowStock =
      products?.filter((p: any) => p.stock_qty <= (p.low_stock_threshold ?? 5)) ?? [];
    const published = products?.filter((p: any) => p.is_published).length ?? 0;

    return {
      products: products ?? [],
      orders: orders ?? [],
      kpis: {
        monthGrossCents: monthGross,
        toShip,
        shipped,
        lowStockCount: lowStock.length,
        publishedCount: published,
        totalProducts: products?.length ?? 0,
      },
      lowStock,
    };
  });

export const upsertProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        id: z.string().uuid().optional(),
        businessId: z.string().uuid(),
        sku: z.string().max(60).optional(),
        title: z.string().min(1).max(160),
        description: z.string().max(2000).optional(),
        category: z.string().max(60).optional(),
        priceCents: z.number().int().min(0),
        stockQty: z.number().int().min(0),
        lowStockThreshold: z.number().int().min(0).optional(),
        isPublished: z.boolean(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertMember(context, data.businessId);
    const payload = {
      business_id: data.businessId,
      sku: data.sku ?? null,
      title: data.title,
      description: data.description ?? null,
      category: data.category ?? null,
      price_cents: data.priceCents,
      stock_qty: data.stockQty,
      low_stock_threshold: data.lowStockThreshold ?? 5,
      is_published: data.isPublished,
    };
    const q = data.id
      ? context.supabase
          .from("inventory_products")
          .update(payload)
          .eq("id", data.id)
          .select()
          .single()
      : context.supabase
          .from("inventory_products")
          .insert(payload)
          .select()
          .single();
    const { data: row, error } = await q;
    if (error) throw new Response(error.message, { status: 400 });
    return row;
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({ id: z.string().uuid(), businessId: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertMember(context, data.businessId);
    const { error } = await context.supabase
      .from("inventory_products")
      .delete()
      .eq("id", data.id);
    if (error) throw new Response(error.message, { status: 400 });
    return { ok: true };
  });

export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        id: z.string().uuid(),
        businessId: z.string().uuid(),
        status: z.enum([
          "pending",
          "paid",
          "shipped",
          "delivered",
          "cancelled",
          "refunded",
        ]),
        trackingNumber: z.string().max(80).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertMember(context, data.businessId);
    const patch: any = { status: data.status };
    if (data.trackingNumber) patch.tracking_number = data.trackingNumber;
    const { data: row, error } = await context.supabase
      .from("product_orders")
      .update(patch)
      .eq("id", data.id)
      .eq("business_id", data.businessId)
      .select()
      .single();
    if (error) throw new Response(error.message, { status: 400 });
    return row;
  });
