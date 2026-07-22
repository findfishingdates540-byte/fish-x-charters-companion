/**
 * Gear/apparel marketplace, pixel-ported from public/dashboards/marketplace.html.
 * Catalog is currently client-side demo data — no products/orders tables exist yet;
 * add schema + server fns to make orders persistent.
 */
import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";

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
  green: "#1f8a5b",
  greensoft: "#e2f2ea",
  ond: "#eaf1f6",
  ondmut: "#93a7b7",
  tmut: "#5c6b78",
  line: "rgba(13,34,54,.10)",
  lined: "rgba(255,255,255,.12)",
};

type Cat = "rods" | "tackle" | "apparel" | "electronics";
type IconKind = "rod" | "reel" | "lure" | "shirt" | "cap" | "spool" | "sonar" | "jacket" | "hook";

type Product = {
  id: string;
  name: string;
  seller: string;
  sellerType: string;
  price: number;
  rating: string;
  reviews: number;
  cat: Cat;
  badge?: string;
  icon: IconKind;
};

const CATALOG: Product[] = [
  { id: "p1", name: "Apex 7'0\" Inshore Spinning Rod", seller: "Apex Rod Co.", sellerType: "Gear maker", price: 189, rating: "4.9", reviews: 214, cat: "rods", badge: "Bestseller", icon: "rod" },
  { id: "p2", name: "Sealine 4000 Spinning Reel", seller: "Reel Deal Tackle", sellerType: "Tackle shop", price: 145, rating: "4.8", reviews: 167, cat: "rods", icon: "reel" },
  { id: "p3", name: "Tarpon Slam Lure Kit · 12 pc", seller: "Reel Deal Tackle", sellerType: "Tackle shop", price: 42, rating: "4.9", reviews: 98, cat: "tackle", badge: "Shop pick", icon: "lure" },
  { id: "p4", name: "UPF 50 Performance Hoodie", seller: "Tidewater Apparel", sellerType: "Apparel brand", price: 68, rating: "4.9", reviews: 342, cat: "apparel", badge: "Bestseller", icon: "shirt" },
  { id: "p5", name: "Legend Trucker Cap", seller: "Tidewater Apparel", sellerType: "Apparel brand", price: 32, rating: "4.7", reviews: 120, cat: "apparel", icon: "cap" },
  { id: "p6", name: "ProBraid 30 lb · 300 yd", seller: "Reel Deal Tackle", sellerType: "Tackle shop", price: 28, rating: "4.8", reviews: 76, cat: "tackle", icon: "spool" },
  { id: "p7", name: "CoastScan 7\" Sonar / GPS", seller: "Apex Rod Co.", sellerType: "Gear maker", price: 899, rating: "4.9", reviews: 58, cat: "electronics", badge: "New", icon: "sonar" },
  { id: "p8", name: "Foul-Weather Shell Jacket", seller: "Tidewater Apparel", sellerType: "Apparel brand", price: 148, rating: "4.8", reviews: 203, cat: "apparel", icon: "jacket" },
  { id: "p9", name: "Circle Hook Pro Pack · 50", seller: "Reel Deal Tackle", sellerType: "Tackle shop", price: 18, rating: "4.9", reviews: 311, cat: "tackle", icon: "hook" },
];

const CATS: Array<{ k: "all" | Cat; label: string }> = [
  { k: "all", label: "All" },
  { k: "rods", label: "Rods & reels" },
  { k: "tackle", label: "Tackle" },
  { k: "apparel", label: "Apparel" },
  { k: "electronics", label: "Electronics" },
];

const money = (n: number) => `$${Math.round(n).toLocaleString()}`;

const tileFor = (cat: Cat): { bg: string; ink: string } => {
  if (cat === "rods") return { bg: "linear-gradient(150deg,#f4e6cd,#ecd8b8)", ink: "#a97e3c" };
  if (cat === "tackle") return { bg: "linear-gradient(150deg,#e2eef2,#d2e4ea)", ink: "#1f9fbe" };
  if (cat === "apparel") return { bg: "linear-gradient(150deg,#e9edf1,#dde3e9)", ink: "#5c6b78" };
  return { bg: "linear-gradient(150deg,#12314b,#0a2236)", ink: "#e3c089" };
};

function ProductIcon({ kind, size = 46 }: { kind: IconKind; size?: number }) {
  const paths: Record<IconKind, ReactNode> = {
    rod: (<><path d="M3 21 20 4" /><path d="M20 4c1.5 3-1 6-3 6" /><circle cx="6" cy="18" r="1.2" /><circle cx="10" cy="14" r="1.2" /><circle cx="14" cy="10" r="1.2" /></>),
    reel: (<><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2.4" /><path d="M12 5V2M19 12h3" /></>),
    lure: (<><path d="M3 12c4-5 10-6 15-3l3 3-3 3c-5 3-11 2-15-3z" /><circle cx="16" cy="11" r=".9" /><path d="M8 15l-1.5 4M12 16l0 4" /></>),
    shirt: (<path d="M8 4 4 7l2 3 2-1v11h8V9l2 1 2-3-4-3-2 2h-4z" />),
    cap: (<><path d="M4 13a8 8 0 0 1 16 0v2H4z" /><path d="M4 15c6 3 10 3 16 0M12 5V3" /></>),
    spool: (<><circle cx="12" cy="12" r="7.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1.5" /></>),
    sonar: (<><rect x="3" y="5" width="18" height="13" rx="2" /><path d="M6 14l3-4 3 2 4-5" /><path d="M9 21h6" /></>),
    jacket: (<><path d="M9 3h6l4 4-2 3-1-1v12H8V9L7 10 5 7z" /><path d="M12 3v18" /></>),
    hook: (<><path d="M16 3a5 5 0 0 1 0 10c-3 0-5-2-5-5" /><path d="M11 8v8a4 4 0 0 0 8 0" /></>),
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      {paths[kind]}
    </svg>
  );
}

export function Marketplace() {
  const [cat, setCat] = useState<"all" | Cat>("all");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [step, setStep] = useState<"cart" | "checkout" | "done">("cart");
  const [orderId, setOrderId] = useState("");
  const [toast, setToast] = useState("");

  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 2200);
  };

  const visible = useMemo(() => CATALOG.filter((p) => cat === "all" || p.cat === cat), [cat]);
  const lines = useMemo(
    () =>
      CATALOG.map((p) => ({ p, qty: cart[p.id] ?? 0 })).filter((l) => l.qty > 0),
    [cart],
  );
  const count = lines.reduce((a, l) => a + l.qty, 0);
  const subtotal = lines.reduce((a, l) => a + l.p.price * l.qty, 0);
  const freeShip = subtotal >= 150 || subtotal === 0;
  const ship = freeShip ? 0 : 8;
  const total = subtotal + ship;

  const sellerGroups = useMemo(() => {
    const map: Record<string, { total: number; items: number }> = {};
    lines.forEach((l) => {
      const key = l.p.seller;
      if (!map[key]) map[key] = { total: 0, items: 0 };
      map[key].total += l.p.price * l.qty;
      map[key].items += l.qty;
    });
    return Object.entries(map).map(([seller, v]) => ({
      seller,
      total: money(v.total),
      detail: `${v.items} ${v.items > 1 ? "items" : "item"} · escrow-protected`,
    }));
  }, [lines]);

  const drawerTitle = step === "cart" ? `Your cart${count ? " · " + count : ""}` : step === "checkout" ? "Checkout" : "Confirmed";

  const catButtonStyle = (on: boolean): CSSProperties => ({
    background: on ? V.navy : V.card,
    border: `1px solid ${on ? V.navy : "rgba(13,34,54,.12)"}`,
    color: on ? "#fff" : V.ink,
    borderRadius: 30,
    padding: "10px 18px",
    fontFamily: V.sans,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    transition: "background .2s, color .2s, border-color .2s",
  });

  return (
    <div id="mkt" style={{ minHeight: "100vh", background: V.paper, color: V.ink, fontFamily: V.sans }}>
      {/* NAV */}
      <header style={{ position: "sticky", top: 0, zIndex: 40, background: V.navy, color: V.ond }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 28px", height: 64, display: "flex", alignItems: "center", gap: 22 }}>
          <Link to="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: V.ondmut, textDecoration: "none", fontSize: 13, fontWeight: 600 }}>
            <span>←</span> Dashboard
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 10, height: 10, background: V.sand, transform: "rotate(45deg)", display: "inline-block", borderRadius: 1 }} />
            <span style={{ fontFamily: V.serif, fontWeight: 600, fontSize: 19, letterSpacing: ".1em" }}>FISH—X</span>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".16em", textTransform: "uppercase", color: V.sand, marginLeft: 4 }}>Marketplace</span>
          </div>
          <label style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 9, background: "rgba(255,255,255,.06)", border: `1px solid ${V.lined}`, borderRadius: 30, padding: "9px 15px", width: 250 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#93a7b7" strokeWidth={1.8}>
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input type="text" placeholder="Search rods, lures, apparel…" style={{ border: 0, outline: "none", background: "transparent", fontFamily: V.sans, fontSize: 13.5, color: "#fff", width: "100%" }} />
          </label>
          <button
            onClick={() => setCartOpen(true)}
            style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 9, background: V.sand, color: "#1c1303", border: 0, borderRadius: 30, padding: "11px 18px", fontFamily: V.sans, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9}>
              <path d="M6 8h12l-1.2 10H7.2z" />
              <path d="M9 8V6a3 3 0 0 1 6 0v2" />
            </svg>
            Cart
            {count > 0 && (
              <span style={{ background: "#1c1303", color: V.sand, fontSize: 11, fontWeight: 700, borderRadius: 20, padding: "1px 7px" }}>{count}</span>
            )}
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 1180, margin: "0 auto", padding: "26px 28px 60px" }}>
        {/* ESCROW RIBBON */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, background: V.card, border: `1px solid ${V.line}`, borderRadius: 14, padding: "12px 18px", marginBottom: 22 }}>
          <span style={{ width: 30, height: 30, borderRadius: 9, background: V.cyansoft, display: "grid", placeItems: "center", color: V.cyan, flex: "none" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <rect x="4" y="10" width="16" height="11" rx="2.5" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
          </span>
          <span style={{ fontSize: 13, color: V.ink }}>
            <b>Every order is escrow-protected</b> — sellers are paid only after your delivery is confirmed. Verified operators only.
          </span>
        </div>

        {/* HEADING */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 18, flexWrap: "wrap", marginBottom: 20 }}>
          <div>
            <h1 style={{ fontFamily: V.serif, fontWeight: 600, fontSize: 36, letterSpacing: "-.01em", lineHeight: 1.05, margin: "0 0 6px", color: V.ink }}>
              Gear &amp; apparel, from the source.
            </h1>
            <div style={{ fontSize: 14, color: V.tmut }}>
              Tackle shops, gear makers and apparel brands — all verified, all escrow-backed.
            </div>
          </div>
          <span style={{ fontSize: 12.5, color: V.tmut }}>{visible.length} products</span>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 26 }}>
          {CATS.map((c) => (
            <button key={c.k} onClick={() => setCat(c.k)} style={catButtonStyle(cat === c.k)}>
              {c.label}
            </button>
          ))}
        </div>

        {/* GRID */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
          {visible.map((p) => {
            const tile = tileFor(p.cat);
            const inCart = !!cart[p.id];
            return (
              <article
                key={p.id}
                style={{ background: V.card, border: `1px solid ${V.line}`, borderRadius: 18, overflow: "hidden", display: "flex", flexDirection: "column" }}
              >
                <div style={{ position: "relative", height: 170, background: tile.bg, display: "grid", placeItems: "center" }}>
                  <span style={{ color: tile.ink, opacity: 0.9 }}>
                    <ProductIcon kind={p.icon} />
                  </span>
                  {p.badge && (
                    <span style={{ position: "absolute", top: 12, left: 12, background: "rgba(6,21,31,.72)", color: "#fff", fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", padding: "5px 10px", borderRadius: 20 }}>
                      {p.badge}
                    </span>
                  )}
                </div>
                <div style={{ padding: "16px 18px 18px", display: "flex", flexDirection: "column", flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
                    <span style={{ width: 16, height: 16, borderRadius: "50%", background: V.sand, display: "grid", placeItems: "center", color: "#1c1303", fontSize: 8, flex: "none" }}>✓</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: V.tmut }}>{p.seller}</span>
                    <span style={{ fontSize: 11, color: V.tmut, opacity: 0.7 }}>· {p.sellerType}</span>
                  </div>
                  <h3 style={{ fontFamily: V.serif, fontWeight: 600, fontSize: 18.5, lineHeight: 1.15, margin: "0 0 8px", color: V.ink }}>
                    {p.name}
                  </h3>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: V.tmut, marginBottom: 14 }}>
                    <span style={{ color: V.sand }}>★</span>
                    <b style={{ color: V.ink }}>{p.rating}</b>
                    <span>({p.reviews})</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto" }}>
                    <span style={{ fontFamily: V.serif, fontSize: 21, fontWeight: 600, color: V.goldtext }}>{money(p.price)}</span>
                    <button
                      onClick={() => {
                        setCart((c) => ({ ...c, [p.id]: (c[p.id] ?? 0) + 1 }));
                        showToast(`${p.name} added — escrow-protected`);
                      }}
                      style={{
                        background: inCart ? V.greensoft : V.navy,
                        color: inCart ? V.green : "#fff",
                        border: 0,
                        borderRadius: 10,
                        padding: "10px 16px",
                        fontFamily: V.sans,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {inCart ? "✓ In cart" : "Add to cart"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </main>

      {/* CART DRAWER */}
      {cartOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 70 }}>
          <div onClick={() => setCartOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(6,21,31,.5)", backdropFilter: "blur(3px)" }} />
          <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 440, maxWidth: "92vw", background: V.card, boxShadow: "-30px 0 70px -30px rgba(0,0,0,.5)", display: "flex", flexDirection: "column" }}>
            {/* header */}
            <div style={{ padding: "20px 24px", borderBottom: `1px solid ${V.line}`, display: "flex", alignItems: "center", gap: 12 }}>
              {step === "checkout" && (
                <button
                  onClick={() => setStep("cart")}
                  style={{ width: 32, height: 32, borderRadius: "50%", border: `1px solid ${V.line}`, background: "transparent", cursor: "pointer", color: V.ink, fontSize: 14, flex: "none" }}
                >
                  ←
                </button>
              )}
              <div style={{ fontFamily: V.serif, fontWeight: 600, fontSize: 22, color: V.ink, flex: 1 }}>{drawerTitle}</div>
              <button
                onClick={() => setCartOpen(false)}
                style={{ width: 32, height: 32, borderRadius: "50%", border: `1px solid ${V.line}`, background: "transparent", cursor: "pointer", color: V.tmut, fontSize: 14, flex: "none" }}
              >
                ✕
              </button>
            </div>

            {step === "cart" && (
              <>
                <div style={{ flex: 1, overflowY: "auto", padding: "18px 24px" }}>
                  {count > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      {lines.map((l) => {
                        const tile = tileFor(l.p.cat);
                        return (
                          <div key={l.p.id} style={{ display: "flex", gap: 13, border: `1px solid ${V.line}`, borderRadius: 14, padding: 12 }}>
                            <div style={{ width: 58, height: 58, borderRadius: 10, background: tile.bg, display: "grid", placeItems: "center", flex: "none", color: tile.ink }}>
                              <ProductIcon kind={l.p.icon} size={26} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13.5, fontWeight: 700, color: V.ink, lineHeight: 1.25 }}>{l.p.name}</div>
                              <div style={{ fontSize: 11.5, color: V.tmut, marginTop: 2 }}>{l.p.seller}</div>
                              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
                                <button
                                  onClick={() => setCart((c) => { const n = { ...c }; if (l.qty <= 1) delete n[l.p.id]; else n[l.p.id] = l.qty - 1; return n; })}
                                  style={{ width: 22, height: 22, borderRadius: "50%", border: `1px solid ${V.line}`, background: "transparent", color: V.ink, fontSize: 13, cursor: "pointer", display: "grid", placeItems: "center", padding: 0 }}
                                >
                                  −
                                </button>
                                <span style={{ fontSize: 13, fontWeight: 700, color: V.ink, minWidth: 14, textAlign: "center" }}>{l.qty}</span>
                                <button
                                  onClick={() => setCart((c) => ({ ...c, [l.p.id]: l.qty + 1 }))}
                                  style={{ width: 22, height: 22, borderRadius: "50%", border: `1px solid ${V.line}`, background: "transparent", color: V.ink, fontSize: 13, cursor: "pointer", display: "grid", placeItems: "center", padding: 0 }}
                                >
                                  +
                                </button>
                                <button
                                  onClick={() => setCart((c) => { const n = { ...c }; delete n[l.p.id]; return n; })}
                                  style={{ marginLeft: "auto", background: "transparent", border: 0, color: V.tmut, fontSize: 11.5, fontWeight: 600, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 2 }}
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                            <div style={{ fontFamily: V.serif, fontSize: 17, fontWeight: 600, color: V.ink, flex: "none" }}>
                              {money(l.p.price * l.qty)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", padding: "60px 10px" }}>
                      <div style={{ width: 56, height: 56, borderRadius: "50%", background: V.paper, border: `1px solid ${V.line}`, display: "grid", placeItems: "center", margin: "0 auto 14px", color: V.tmut }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
                          <path d="M6 8h12l-1.2 10H7.2z" />
                          <path d="M9 8V6a3 3 0 0 1 6 0v2" />
                        </svg>
                      </div>
                      <div style={{ fontFamily: V.serif, fontSize: 20, color: V.ink }}>Your cart is empty</div>
                      <div style={{ fontSize: 13, color: V.tmut, marginTop: 3 }}>Add gear from verified shops and brands.</div>
                    </div>
                  )}
                </div>
                {count > 0 && (
                  <div style={{ padding: "18px 24px", borderTop: `1px solid ${V.line}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, padding: "3px 0" }}>
                      <span style={{ color: V.tmut }}>Subtotal</span>
                      <span style={{ fontWeight: 600, color: V.ink }}>{money(subtotal)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, padding: "3px 0" }}>
                      <span style={{ color: V.tmut }}>Shipping</span>
                      <span style={{ fontWeight: 600, color: freeShip ? V.green : V.ink }}>{freeShip ? "Free" : money(ship)}</span>
                    </div>
                    <button
                      onClick={() => setStep("checkout")}
                      style={{ width: "100%", marginTop: 14, background: V.sand, color: "#1c1303", border: 0, borderRadius: 12, padding: 15, fontFamily: V.sans, fontSize: 13, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", cursor: "pointer" }}
                    >
                      Checkout · {money(total)}
                    </button>
                  </div>
                )}
              </>
            )}

            {step === "checkout" && (
              <>
                <div style={{ flex: 1, overflowY: "auto", padding: "18px 24px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: V.goldtext, marginBottom: 10 }}>Order summary</div>
                  <div style={{ border: `1px solid ${V.line}`, borderRadius: 13, padding: "6px 16px", marginBottom: 18 }}>
                    {sellerGroups.map((g) => (
                      <div key={g.seller} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderBottom: `1px solid ${V.line}` }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: V.ink }}>{g.seller}</div>
                          <div style={{ fontSize: 11.5, color: V.tmut }}>{g.detail}</div>
                        </div>
                        <span style={{ fontFamily: V.serif, fontSize: 16, fontWeight: 600, color: V.ink }}>{g.total}</span>
                      </div>
                    ))}
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "10px 0 4px" }}>
                      <span style={{ color: V.tmut }}>Shipping</span>
                      <span style={{ fontWeight: 600, color: freeShip ? V.green : V.ink }}>{freeShip ? "Free" : money(ship)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 12px", borderTop: `1px solid ${V.line}`, marginTop: 6 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: V.ink }}>Total · into escrow</span>
                      <span style={{ fontFamily: V.serif, fontSize: 19, fontWeight: 600, color: V.ink }}>{money(total)}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10, background: V.cyansoft, border: "1px solid rgba(31,159,190,.3)", borderRadius: 12, padding: "12px 14px" }}>
                    <span style={{ color: V.cyan, flex: "none", marginTop: 1 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                        <rect x="4" y="10" width="16" height="11" rx="2.5" />
                        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                      </svg>
                    </span>
                    <span style={{ fontSize: 12.5, lineHeight: 1.5, color: V.ink }}>
                      Each seller is paid from escrow only when you confirm their delivery. Short or damaged shipment? Your money never left Fish-X.
                    </span>
                  </div>
                </div>
                <div style={{ padding: "18px 24px", borderTop: `1px solid ${V.line}` }}>
                  <button
                    onClick={() => {
                      setOrderId("FX-" + (8400 + Math.floor(Math.random() * 90)));
                      setStep("done");
                    }}
                    style={{ width: "100%", background: V.navy, color: "#fff", border: 0, borderRadius: 12, padding: 16, fontFamily: V.sans, fontSize: 13, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", cursor: "pointer" }}
                  >
                    Place order · fund escrow {money(total)}
                  </button>
                </div>
              </>
            )}

            {step === "done" && (
              <div style={{ flex: 1, overflowY: "auto", padding: "30px 24px", textAlign: "center" }}>
                <div style={{ width: 70, height: 70, borderRadius: "50%", background: V.greensoft, display: "grid", placeItems: "center", margin: "0 auto 18px" }}>
                  <span style={{ color: V.green, fontSize: 30 }}>✓</span>
                </div>
                <div style={{ fontFamily: V.serif, fontWeight: 600, fontSize: 26, color: V.ink }}>Order placed &amp; funded</div>
                <div style={{ fontSize: 13.5, color: V.tmut, margin: "6px 0 22px" }}>
                  Order {orderId} · {money(total)} secured in escrow
                </div>
                <Link
                  to="/dashboard"
                  style={{ display: "block", background: V.sand, color: "#1c1303", textDecoration: "none", borderRadius: 12, padding: 15, fontSize: 13, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase" }}
                >
                  Track in my dashboard
                </Link>
                <button
                  onClick={() => { setCartOpen(false); setStep("cart"); setCart({}); }}
                  style={{ marginTop: 12, background: "transparent", border: 0, cursor: "pointer", fontFamily: V.sans, fontSize: 13, fontWeight: 600, color: V.tmut, textDecoration: "underline", textUnderlineOffset: 3 }}
                >
                  Continue shopping
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", zIndex: 80, display: "flex", alignItems: "center", gap: 11, background: V.navy, color: "#fff", border: "1px solid rgba(255,255,255,.12)", borderRadius: 30, padding: "13px 22px", boxShadow: "0 20px 44px -20px rgba(0,0,0,.6)" }}>
          <span style={{ width: 22, height: 22, borderRadius: "50%", background: V.sand, color: "#1c1303", display: "grid", placeItems: "center", fontSize: 12 }}>✓</span>
          <span style={{ fontSize: 13.5, fontWeight: 600 }}>{toast}</span>
        </div>
      )}
    </div>
  );
}
