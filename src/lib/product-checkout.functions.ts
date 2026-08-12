/**
 * Product (gear / tackle / bait / apparel / manufacturer) checkout.
 *
 * Money model mirrors bookings: the buyer pays the PLATFORM account, orders are
 * created as `pending_payment`, and the Stripe webhook marks them paid and
 * transfers 80% to each vendor's connected account (20% platform fee).
 * A multi-vendor cart produces one order row per vendor but a single Stripe
 * Checkout session.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type StoreProduct = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  priceCents: number;
  compareAtCents: number | null;
  stockQty: number;
  image: string | null;
  businessId: string;
  sellerName: string;
  sellerCategory: string | null;
};

const firstImage = (images: unknown): string | null => {
  if (Array.isArray(images) && images.length > 0) {
    const i = images[0];
    if (typeof i === "string") return i;
    if (i && typeof i === "object" && typeof (i as { url?: string }).url === "string") {
      return (i as { url: string }).url;
    }
  }
  return null;
};

/** Published vendor inventory available to buy in the marketplace. */
export const listStoreProducts = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("inventory_products")
    .select(
      "id,title,description,category,price_cents,compare_at_cents,stock_qty,images,business_id,business:businesses(name,category_key,is_published)",
    )
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Response(error.message, { status: 500 });

  return (data ?? [])
    .filter((p) => (p.business as { is_published?: boolean } | null)?.is_published !== false)
    .map<StoreProduct>((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      category: p.category,
      priceCents: p.price_cents ?? 0,
      compareAtCents: p.compare_at_cents,
      stockQty: p.stock_qty ?? 0,
      image: firstImage(p.images),
      businessId: p.business_id,
      sellerName: (p.business as { name?: string } | null)?.name ?? "Fish-X vendor",
      sellerCategory: (p.business as { category_key?: string } | null)?.category_key ?? null,
    }));
});

const CheckoutInput = z.object({
  items: z
    .array(z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1).max(50) }))
    .min(1)
    .max(30),
  origin: z.string().url().optional(),
  shippingCents: z.number().int().min(0).max(100000).optional(),
});

export const createProductCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => CheckoutInput.parse(i))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { splitAmount, requireStripe, PRODUCT_FEE_RATE } = await import("./stripe.server");

    const ids = data.items.map((i) => i.productId);
    const { data: products, error } = await supabaseAdmin
      .from("inventory_products")
      .select("id,title,sku,price_cents,stock_qty,images,business_id,is_published")
      .in("id", ids);
    if (error) throw new Response(error.message, { status: 500 });

    const byId = new Map((products ?? []).map((p) => [p.id, p]));
    for (const item of data.items) {
      const p = byId.get(item.productId);
      if (!p || !p.is_published) throw new Response("Product is no longer available", { status: 404 });
      if ((p.stock_qty ?? 0) < item.quantity) {
        throw new Response(`Only ${p.stock_qty ?? 0} left of "${p.title}"`, { status: 409 });
      }
    }

    // Group the cart by vendor — one order row per business.
    const groups = new Map<string, Array<{ product: NonNullable<ReturnType<typeof byId.get>>; qty: number }>>();
    for (const item of data.items) {
      const p = byId.get(item.productId)!;
      const list = groups.get(p.business_id) ?? [];
      list.push({ product: p, qty: item.quantity });
      groups.set(p.business_id, list);
    }

    const shippingTotal = data.shippingCents ?? 0;
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name,display_name")
      .eq("id", userId)
      .maybeSingle();
    const buyerName = profile?.full_name ?? profile?.display_name ?? null;

    const orderIds: string[] = [];
    const lineItems: Array<Record<string, unknown>> = [];
    let grandTotal = 0;

    for (const [businessId, lines] of groups) {
      const subtotal = lines.reduce((a, l) => a + (l.product.price_cents ?? 0) * l.qty, 0);
      // Shipping is charged once on the first vendor group.
      const shipping = orderIds.length === 0 ? shippingTotal : 0;
      const total = subtotal + shipping;
      const { platformFeeCents, vendorCents } = splitAmount(total, PRODUCT_FEE_RATE);

      const { data: order, error: ordErr } = await supabaseAdmin
        .from("product_orders")
        .insert({
          business_id: businessId,
          buyer_id: userId,
          buyer_name: buyerName,
          subtotal_cents: subtotal,
          shipping_cents: shipping,
          tax_cents: 0,
          total_cents: total,
          status: "pending_payment",
          payout_cents: vendorCents,
          application_fee_cents: platformFeeCents,
        })
        .select("id")
        .single();
      if (ordErr) throw new Response(ordErr.message, { status: 500 });
      orderIds.push(order.id);
      grandTotal += total;

      const { error: itemErr } = await supabaseAdmin.from("product_order_items").insert(
        lines.map((l) => ({
          order_id: order.id,
          product_id: l.product.id,
          title: l.product.title,
          sku: l.product.sku,
          unit_price_cents: l.product.price_cents ?? 0,
          quantity: l.qty,
        })),
      );
      if (itemErr) throw new Response(itemErr.message, { status: 500 });

      for (const l of lines) {
        const image = firstImage(l.product.images);
        lineItems.push({
          quantity: l.qty,
          price_data: {
            currency: "usd",
            unit_amount: l.product.price_cents ?? 0,
            product_data: {
              name: l.product.title,
              ...(image ? { images: [image] } : {}),
            },
          },
        });
      }
    }

    if (shippingTotal > 0) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: shippingTotal,
          product_data: { name: "Shipping" },
        },
      });
    }

    const stripe = requireStripe();
    const origin = data.origin ?? "https://fishx-charter-hub.lovable.app";
    const metadata = {
      kind: "product_order",
      order_ids: orderIds.join(","),
      buyer_id: userId,
    };
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        line_items: lineItems as never,
        metadata,
        payment_intent_data: { metadata },
        success_url: `${origin}/marketplace?paid=1&order=${orderIds[0]}`,
        cancel_url: `${origin}/marketplace?canceled=1`,
      },
      { idempotencyKey: `product-checkout-${orderIds.join("-")}` },
    );

    await supabaseAdmin
      .from("product_orders")
      .update({
        stripe_session_id: session.id,
        ...(typeof session.payment_intent === "string"
          ? { stripe_payment_intent_id: session.payment_intent }
          : {}),
      })
      .in("id", orderIds);

    return { orderIds, totalCents: grandTotal, checkoutUrl: session.url };
  });

/** Single published vendor product (public — used by the product detail page). */
export const getStoreProduct = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) => z.object({ productId: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: p, error } = await supabaseAdmin
      .from("inventory_products")
      .select(
        "id,title,description,category,price_cents,compare_at_cents,stock_qty,images,business_id,is_published,business:businesses(name,category_key)",
      )
      .eq("id", data.productId)
      .maybeSingle();
    if (error) throw new Response(error.message, { status: 500 });
    if (!p || !p.is_published) return null;
    const product: StoreProduct = {
      id: p.id,
      title: p.title,
      description: p.description,
      category: p.category,
      priceCents: p.price_cents ?? 0,
      compareAtCents: p.compare_at_cents,
      stockQty: p.stock_qty ?? 0,
      image: firstImage(p.images),
      businessId: p.business_id,
      sellerName: (p.business as { name?: string } | null)?.name ?? "Fish-X vendor",
      sellerCategory: (p.business as { category_key?: string } | null)?.category_key ?? null,
    };
    return product;
  });
