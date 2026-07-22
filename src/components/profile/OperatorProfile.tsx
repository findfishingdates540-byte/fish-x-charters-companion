import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

type Service = {
  id: string;
  slug: string | null;
  kind: string;
  title: string;
  description: string | null;
  hero_url: string | null;
  duration_minutes: number | null;
  capacity: number | null;
  base_price_cents: number;
  deposit_cents: number | null;
  target_species: string[] | null;
  departure_location: string | null;
};

type Review = {
  id: string;
  rating: number;
  body: string | null;
  response_body: string | null;
  created_at: string;
  angler: { display_name: string | null; avatar_url: string | null } | null;
};

type Business = {
  id: string;
  slug: string;
  name: string;
  category_key: string;
  tagline: string | null;
  description: string | null;
  hero_url: string | null;
  logo_url: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  verified_at: string | null;
  premium_until: string | null;
};

type Props = {
  business: Business;
  services: Service[];
  reviews: Review[];
  ratingSummary: { average: number; count: number; buckets: number[] };
  variant: "captain" | "guide";
};

const fmtPrice = (cents: number) =>
  `$${Math.round(cents / 100).toLocaleString()}`;

export function OperatorProfile({ business: b, services, reviews, ratingSummary, variant }: Props) {
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(services[0]?.id ?? null);
  const selected = useMemo(() => services.find((s) => s.id === selectedServiceId) ?? services[0], [services, selectedServiceId]);
  const location = [b.city, b.region, b.country].filter(Boolean).join(", ");
  const avg = ratingSummary.average ? ratingSummary.average.toFixed(2) : "—";

  const roleLabel = variant === "captain" ? "Verified captain" : "Verified guide";
  const heroFallback = "linear-gradient(135deg,#0a2236,#06151f)";

  return (
    <div style={{ background: "#eef2f5", minHeight: "100vh", fontFamily: "'Hanken Grotesk', system-ui, sans-serif", color: "#0d2236" }}>
      {/* Nav */}
      <header style={{ position: "sticky", top: 0, zIndex: 40, background: "rgba(9,27,44,.94)", backdropFilter: "saturate(140%) blur(12px)", borderBottom: "1px solid rgba(255,255,255,.1)", color: "#eaf1f6" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 28px", height: 62, display: "flex", alignItems: "center", gap: 24 }}>
          <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "#eaf1f6" }}>
            <span style={{ width: 11, height: 11, background: "#e3c089", transform: "rotate(45deg)", display: "inline-block", borderRadius: 1 }} />
            <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: 20, letterSpacing: ".1em" }}>FISH—X CHARTERS</span>
          </Link>
          <Link to="/discover" style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "#93a7b7", textDecoration: "none", fontSize: 13, fontWeight: 500 }}>
            <span>←</span> Back to directory
          </Link>
        </div>
      </header>

      {/* Cover */}
      <div style={{ position: "relative", height: 280, overflow: "hidden", background: b.hero_url ? `#0a2236 url(${b.hero_url}) center/cover` : heroFallback }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(10,34,54,.35) 0%,rgba(10,34,54,0) 40%,rgba(238,242,245,0) 70%,#eef2f5 100%)" }} />
      </div>

      <main style={{ maxWidth: 1160, margin: "0 auto", padding: "0 28px 64px" }}>
        {/* Identity */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 22, marginTop: -64, position: "relative", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: "none" }}>
            {b.logo_url ? (
              <img src={b.logo_url} alt={b.name} style={{ width: 128, height: 128, borderRadius: 24, objectFit: "cover", border: "5px solid #fff", boxShadow: "0 24px 48px -24px rgba(13,34,54,.55)" }} />
            ) : (
              <div style={{ width: 128, height: 128, borderRadius: 24, background: "#0a2236", border: "5px solid #fff", display: "grid", placeItems: "center", color: "#e3c089", fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 44, fontWeight: 600, boxShadow: "0 24px 48px -24px rgba(13,34,54,.55)" }}>
                {b.name.charAt(0)}
              </div>
            )}
            {b.verified_at && (
              <span title={roleLabel} style={{ position: "absolute", bottom: -8, right: -8, width: 36, height: 36, borderRadius: "50%", background: "#e3c089", display: "grid", placeItems: "center", color: "#1c1303", fontSize: 16, border: "3px solid #fff" }}>✓</span>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 260, paddingBottom: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: 38, letterSpacing: "-.01em", lineHeight: 1, margin: 0 }}>{b.name}</h1>
              {ratingSummary.average >= 4.9 && ratingSummary.count >= 10 && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#f4e6cd", color: "#a97e3c", fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", borderRadius: 20, padding: "5px 11px" }}>★ Top rated</span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#5c6b78", marginTop: 8, flexWrap: "wrap" }}>
              <span style={{ color: "#e3c089" }}>★</span>
              <b style={{ color: "#0d2236" }}>{avg}</b>
              <span>({ratingSummary.count} review{ratingSummary.count === 1 ? "" : "s"})</span>
              {location && <>
                <span style={{ width: 3, height: 3, borderRadius: "50%", background: "#5c6b78", opacity: .5 }} />
                <span>{location}</span>
              </>}
              <span style={{ width: 3, height: 3, borderRadius: "50%", background: "#5c6b78", opacity: .5 }} />
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#1f8a5b", fontWeight: 600 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#1f8a5b" }} />
                Accepting bookings
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 26, padding: "16px 22px", background: "#fff", border: "1px solid rgba(13,34,54,.10)", borderRadius: 16, flex: "none" }}>
            <Stat n={services.length} label="trips" />
            <Stat n={ratingSummary.count} label="reviews" divider />
            <Stat n={b.verified_at ? "✓" : "—"} label={b.verified_at ? "verified" : "pending"} divider />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 360px", gap: 26, marginTop: 34 }}>
          {/* Left column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            {/* About */}
            {b.description && (
              <section style={{ background: "#fff", border: "1px solid rgba(13,34,54,.10)", borderRadius: 20, padding: 26 }}>
                <h2 style={sectionTitle}>About</h2>
                <p style={{ color: "#5c6b78", lineHeight: 1.65, whiteSpace: "pre-wrap", margin: 0 }}>{b.description}</p>
              </section>
            )}

            {/* Services / Trips */}
            <section>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 }}>
                <h2 style={{ ...sectionTitle, margin: 0 }}>{variant === "guide" ? "Guided trips" : "Trips offered"}</h2>
                <span style={{ fontSize: 13, color: "#5c6b78" }}>All escrow-protected</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {services.length === 0 && (
                  <div style={{ background: "#fff", border: "1px dashed rgba(13,34,54,.15)", borderRadius: 18, padding: 32, textAlign: "center", color: "#5c6b78" }}>
                    No published trips yet.
                  </div>
                )}
                {services.map((s) => {
                  const active = selectedServiceId === s.id;
                  return (
                    <article key={s.id} style={{ background: "#fff", border: `1px solid ${active ? "#e3c089" : "rgba(13,34,54,.10)"}`, borderRadius: 18, padding: 16, display: "flex", alignItems: "center", gap: 18 }}>
                      <div style={{ width: 104, height: 80, borderRadius: 12, flex: "none", background: s.hero_url ? `#e9edf1 url(${s.hero_url}) center/cover` : "linear-gradient(135deg,#0a2236,#06151f)" }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: 19, margin: 0, color: "#0d2236" }}>{s.title}</h3>
                        <div style={{ fontSize: 13, color: "#5c6b78", marginTop: 4 }}>
                          {[
                            s.duration_minutes ? `${Math.round(s.duration_minutes / 60)} hr` : null,
                            s.capacity ? `up to ${s.capacity}` : null,
                            s.target_species?.slice(0, 3).join(", "),
                          ].filter(Boolean).join(" · ")}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flex: "none" }}>
                        <div>
                          <span style={{ fontSize: 11, color: "#5c6b78" }}>from </span>
                          <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 22, fontWeight: 600, color: "#a97e3c" }}>{fmtPrice(s.base_price_cents)}</span>
                        </div>
                        <div style={{ fontSize: 11.5, color: "#5c6b78" }}>per trip</div>
                      </div>
                      <button
                        onClick={() => setSelectedServiceId(s.id)}
                        style={{ flex: "none", background: active ? "#0d2236" : "#e3c089", color: active ? "#fff" : "#1c1303", border: 0, borderRadius: 11, padding: "12px 20px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}
                      >
                        {active ? "Selected" : "Select"}
                      </button>
                    </article>
                  );
                })}
              </div>
            </section>

            {/* Reviews */}
            <section style={{ background: "#fff", border: "1px solid rgba(13,34,54,.10)", borderRadius: 20, padding: 26 }}>
              <div style={{ display: "flex", gap: 34, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 24 }}>
                <div style={{ flex: "none", textAlign: "center", padding: "6px 0" }}>
                  <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: 54, lineHeight: 1 }}>{avg}</div>
                  <div style={{ color: "#e3c089", fontSize: 14, letterSpacing: 2, margin: "6px 0 2px" }}>★★★★★</div>
                  <div style={{ fontSize: 12, color: "#5c6b78" }}>{ratingSummary.count} verified review{ratingSummary.count === 1 ? "" : "s"}</div>
                </div>
                <div style={{ flex: 1, minWidth: 240, display: "flex", flexDirection: "column", gap: 7, paddingTop: 4 }}>
                  {[5, 4, 3, 2, 1].map((star) => {
                    const cnt = ratingSummary.buckets[star - 1] ?? 0;
                    const pct = ratingSummary.count ? (cnt / ratingSummary.count) * 100 : 0;
                    return (
                      <div key={star} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontSize: 12, color: "#5c6b78", width: 44 }}>{star} star{star === 1 ? "" : "s"}</span>
                        <div style={{ flex: 1, height: 7, borderRadius: 7, background: "#eef2f5", overflow: "hidden" }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: "#e3c089", borderRadius: 7 }} />
                        </div>
                        <span style={{ fontSize: 12, color: "#5c6b78", width: 34, textAlign: "right" }}>{cnt}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {reviews.length === 0 && (
                  <p style={{ color: "#5c6b78", margin: "20px 0" }}>No reviews yet. Be the first to book and share your experience.</p>
                )}
                {reviews.map((r) => (
                  <figure key={r.id} style={{ margin: 0, padding: "20px 0", borderTop: "1px solid rgba(13,34,54,.10)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                      {r.angler?.avatar_url ? (
                        <img src={r.angler.avatar_url} alt="" style={{ width: 42, height: 42, borderRadius: "50%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#0a2236", color: "#e3c089", display: "grid", placeItems: "center", fontWeight: 600 }}>
                          {(r.angler?.display_name ?? "A").charAt(0)}
                        </div>
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{r.angler?.display_name ?? "Fish-X angler"}</div>
                        <div style={{ fontSize: 12, color: "#5c6b78" }}>{new Date(r.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" })}</div>
                      </div>
                      <span style={{ color: "#e3c089", fontSize: 12, letterSpacing: 1.5, flex: "none" }}>{"★".repeat(r.rating)}</span>
                    </div>
                    {r.body && <blockquote style={{ fontSize: 14, lineHeight: 1.6, color: "#5c6b78", margin: 0 }}>{r.body}</blockquote>}
                    {r.response_body && (
                      <div style={{ marginTop: 12, padding: 12, background: "#f7f9fb", borderRadius: 10, fontSize: 13, color: "#0d2236" }}>
                        <b>Response from {b.name}:</b> {r.response_body}
                      </div>
                    )}
                  </figure>
                ))}
              </div>
            </section>
          </div>

          {/* Right rail */}
          <aside style={{ display: "flex", flexDirection: "column", gap: 18, position: "sticky", top: 86, alignSelf: "flex-start" }}>
            <div style={{ background: "#fff", border: "1px solid rgba(13,34,54,.10)", borderRadius: 20, padding: 24, boxShadow: "0 30px 60px -44px rgba(13,34,54,.55)" }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                  <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 27, fontWeight: 600 }}>
                    {selected ? fmtPrice(selected.base_price_cents) : "—"}
                  </span>
                  <span style={{ fontSize: 12.5, color: "#5c6b78" }}> per trip</span>
                </div>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "#1f9fbe", background: "#e2eef2", borderRadius: 20, padding: "4px 10px" }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#1f9fbe" }} />
                  Escrow
                </span>
              </div>
              {selected && (
                <div style={{ padding: "10px 0", borderTop: "1px solid rgba(13,34,54,.08)", fontSize: 13, color: "#5c6b78", marginBottom: 14 }}>
                  <div style={{ fontWeight: 700, color: "#0d2236", marginBottom: 4 }}>{selected.title}</div>
                  {selected.description && <div>{selected.description.slice(0, 140)}{selected.description.length > 140 ? "…" : ""}</div>}
                </div>
              )}
              {selected ? (
                <Link
                  to="/booking"
                  search={{ serviceId: selected.id }}
                  style={{ display: "block", textAlign: "center", background: "#0d2236", color: "#fff", borderRadius: 12, padding: "14px 16px", fontSize: 13, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", textDecoration: "none" }}
                >
                  Request to book
                </Link>
              ) : (
                <div style={{ padding: 14, textAlign: "center", color: "#5c6b78", fontSize: 13 }}>No bookable trips yet.</div>
              )}
              <div style={{ marginTop: 14, fontSize: 11.5, color: "#5c6b78", textAlign: "center" }}>
                Funds held in escrow · Released 24 hrs after your trip
              </div>
            </div>

            <div style={{ background: "#0a2236", color: "#eaf1f6", borderRadius: 20, padding: 22 }}>
              <div style={{ fontSize: 10.5, letterSpacing: ".18em", textTransform: "uppercase", color: "#e3c089", fontWeight: 700 }}>Contact</div>
              <div style={{ marginTop: 10, fontSize: 13.5, display: "flex", flexDirection: "column", gap: 8 }}>
                {b.address && <div>📍 {[b.address, b.city].filter(Boolean).join(", ")}</div>}
                {b.website && <a href={b.website} target="_blank" rel="noreferrer" style={{ color: "#e3c089", textDecoration: "none" }}>Website ↗</a>}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function Stat({ n, label, divider }: { n: number | string; label: string; divider?: boolean }) {
  return (
    <div style={divider ? { borderLeft: "1px solid rgba(13,34,54,.10)", paddingLeft: 26 } : undefined}>
      <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 24, fontWeight: 600, lineHeight: 1 }}>{n}</div>
      <div style={{ fontSize: 11.5, color: "#5c6b78", marginTop: 3 }}>{label}</div>
    </div>
  );
}

const sectionTitle: React.CSSProperties = {
  fontFamily: "'Cormorant Garamond', Georgia, serif",
  fontWeight: 600,
  fontSize: 23,
  margin: "0 0 14px",
  color: "#0d2236",
};
