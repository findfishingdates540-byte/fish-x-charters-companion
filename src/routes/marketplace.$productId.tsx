import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  CATALOG,
  tileFor,
  money,
  ProductIcon,
  catFromCategory,
  iconFromCategory,
  type Product,
} from "@/components/marketplace/catalog";
import { getStoreProduct, createProductCheckout } from "@/lib/product-checkout.functions";

export const Route = createFileRoute("/marketplace/$productId")({
  loader: async ({ params }) => {
    const demo = CATALOG.find((p) => p.id === params.productId);
    if (demo) return { product: demo };
    // Real vendor inventory row (UUID id).
    const isUuid = /^[0-9a-f-]{36}$/i.test(params.productId);
    if (isUuid) {
      const row = await getStoreProduct({ data: { productId: params.productId } });
      if (row) {
        const cat = catFromCategory(row.category, row.sellerCategory);
        const product: Product = {
          id: row.id,
          name: row.title,
          seller: row.sellerName,
          sellerType: "Verified vendor",
          price: row.priceCents / 100,
          rating: "5.0",
          reviews: 0,
          cat,
          icon: iconFromCategory(cat, row.title),
          description: row.description ?? undefined,
          live: true,
          image: row.image,
          stockQty: row.stockQty,
        };
        return { product };
      }
    }
    throw notFound();
  },

  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Product not found — Fish-X Charters" }, { name: "robots", content: "noindex" }] };
    const { product } = loaderData;
    const title = `${product.name} — Fish-X Marketplace`;
    const description = product.description ?? `${product.name} from ${product.seller}. Escrow-protected on Fish-X.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "product" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: ProductDetail,
});

const V = {
  serif: "'Cormorant Garamond',Georgia,serif",
  sans: "'Hanken Grotesk',system-ui,sans-serif",
  ink: "#0d2236",
  navy: "#0a2236",
  paper: "#eef2f5",
  card: "#ffffff",
  sand: "#e3c089",
  goldtext: "#a97e3c",
  cyan: "#1f9fbe",
  cyansoft: "#e2eef2",
  ondmut: "#93a7b7",
  tmut: "#5c6b78",
  line: "rgba(13,34,54,.10)",
  lined: "rgba(255,255,255,.12)",
};

function ProductDetail() {
  const { product } = Route.useLoaderData();
  const tile = tileFor(product.cat);
  const related = CATALOG.filter((p) => p.cat === product.cat && p.id !== product.id).slice(0, 3);
  const startCheckout = useServerFn(createProductCheckout);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  /** Live products go straight to Stripe Checkout; demo items bounce to the cart. */
  const buyNow = async () => {
    if (!product.live) {
      window.location.href = "/marketplace";
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const res = await startCheckout({
        data: {
          items: [{ productId: product.id, quantity: 1 }],
          origin: window.location.origin,
        },
      });
      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
        return;
      }
      setErr("Could not start checkout.");
    } catch (e) {
      const msg = e instanceof Response ? await e.text() : String(e);
      setErr(msg.slice(0, 160) || "Checkout failed");
    } finally {
      setBusy(false);
    }
  };



  return (
    <div style={{ minHeight: "100vh", background: V.paper, color: V.ink, fontFamily: V.sans }}>
      <header style={{ position: "sticky", top: 0, zIndex: 40, background: V.navy, color: "#eaf1f6" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 28px", height: 64, display: "flex", alignItems: "center", gap: 22 }}>
          <Link to="/marketplace" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: V.ondmut, textDecoration: "none", fontSize: 13, fontWeight: 600 }}>
            <span>←</span> Marketplace
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 10, height: 10, background: V.sand, transform: "rotate(45deg)", display: "inline-block", borderRadius: 1 }} />
            <span style={{ fontFamily: V.serif, fontWeight: 600, fontSize: 19, letterSpacing: ".1em" }}>FISH—X</span>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".16em", textTransform: "uppercase", color: V.sand, marginLeft: 4 }}>Product</span>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1180, margin: "0 auto", padding: "28px 28px 60px" }}>
        <div className="mkt-detail-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0,1.05fr) minmax(0,1fr)", gap: 36 }}>
          <div style={{ background: V.card, border: `1px solid ${V.line}`, borderRadius: 22, overflow: "hidden" }}>
            <div style={{ position: "relative", aspectRatio: "1 / 1", background: tile.bg, display: "grid", placeItems: "center" }}>
              {product.image ? (
                <img src={product.image} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ color: tile.ink, opacity: 0.9 }}>
                  <ProductIcon kind={product.icon} size={180} />
                </span>
              )}

              {product.badge && (
                <span style={{ position: "absolute", top: 18, left: 18, background: "rgba(6,21,31,.72)", color: "#fff", fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", padding: "6px 12px", borderRadius: 20 }}>
                  {product.badge}
                </span>
              )}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ width: 18, height: 18, borderRadius: "50%", background: V.sand, display: "grid", placeItems: "center", color: "#1c1303", fontSize: 9 }}>✓</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: V.tmut }}>{product.seller}</span>
              <span style={{ fontSize: 12, color: V.tmut, opacity: 0.7 }}>· {product.sellerType}</span>
            </div>
            <h1 style={{ fontFamily: V.serif, fontWeight: 600, fontSize: 40, lineHeight: 1.05, letterSpacing: "-.01em", margin: "0 0 12px" }}>
              {product.name}
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: V.tmut, marginBottom: 18 }}>
              <span style={{ color: V.sand }}>★</span>
              <b style={{ color: V.ink }}>{product.rating}</b>
              <span>({product.reviews} reviews)</span>
            </div>
            <div style={{ fontFamily: V.serif, fontSize: 34, fontWeight: 600, color: V.goldtext, marginBottom: 20 }}>{money(product.price)}</div>

            {product.description && (
              <p style={{ fontSize: 15, lineHeight: 1.6, color: V.tmut, margin: "0 0 22px" }}>{product.description}</p>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: 12, background: V.cyansoft, border: `1px solid ${V.line}`, borderRadius: 12, padding: "12px 16px", marginBottom: 22 }}>
              <span style={{ width: 28, height: 28, borderRadius: 8, background: "#fff", display: "grid", placeItems: "center", color: V.cyan, flex: "none" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9}>
                  <rect x="4" y="10" width="16" height="11" rx="2.5" />
                  <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                </svg>
              </span>
              <span style={{ fontSize: 13, color: V.ink }}>
                <b>Escrow-protected.</b> Seller is paid only after your delivery is confirmed.
              </span>
            </div>

            <div style={{ display: "flex", gap: 12, marginBottom: 28 }}>
              <button style={{ flex: 1, background: V.navy, color: "#fff", border: 0, borderRadius: 12, padding: "14px 18px", fontFamily: V.sans, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                Add to cart
              </button>
              <button style={{ background: V.sand, color: "#1c1303", border: 0, borderRadius: 12, padding: "14px 22px", fontFamily: V.sans, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                Buy now
              </button>
            </div>

            {product.specs && product.specs.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: V.tmut, marginBottom: 10 }}>Specifications</div>
                <dl style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px", margin: 0 }}>
                  {product.specs.map((s: { label: string; value: string }) => (
                    <div key={s.label} style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${V.line}`, padding: "8px 0" }}>
                      <dt style={{ fontSize: 13, color: V.tmut }}>{s.label}</dt>
                      <dd style={{ fontSize: 13, fontWeight: 600, color: V.ink, margin: 0 }}>{s.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        </div>

        {related.length > 0 && (
          <section style={{ marginTop: 56 }}>
            <h2 style={{ fontFamily: V.serif, fontWeight: 600, fontSize: 26, margin: "0 0 18px" }}>More from this category</h2>
            <div className="mkt-related-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
              {related.map((p) => {
                const t = tileFor(p.cat);
                return (
                  <Link
                    key={p.id}
                    to="/marketplace/$productId"
                    params={{ productId: p.id }}
                    style={{ textDecoration: "none", color: "inherit", background: V.card, border: `1px solid ${V.line}`, borderRadius: 18, overflow: "hidden", display: "flex", flexDirection: "column" }}
                  >
                    <div style={{ height: 150, background: t.bg, display: "grid", placeItems: "center", color: t.ink }}>
                      <ProductIcon kind={p.icon} />
                    </div>
                    <div style={{ padding: "14px 16px 16px" }}>
                      <div style={{ fontSize: 12, color: V.tmut, marginBottom: 4 }}>{p.seller}</div>
                      <h3 style={{ fontFamily: V.serif, fontWeight: 600, fontSize: 17, lineHeight: 1.15, margin: "0 0 8px" }}>{p.name}</h3>
                      <div style={{ fontFamily: V.serif, fontSize: 18, fontWeight: 600, color: V.goldtext }}>{money(p.price)}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </main>

      <style>{`
        @media (max-width: 860px) {
          .mkt-detail-grid { grid-template-columns: 1fr !important; }
          .mkt-related-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
