/**
 * Angler → Explore tab. Cinematic charter discovery surface, ported from the
 * Stitch "premium charter marketplace" layout and re-skinned to the Fish-X
 * Charters palette (Deep Hull navy + Sandy Gold). Wired to live Supabase data.
 */
import { Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getAnglerExplore } from "@/lib/angler-explore.functions";

export const anglerExploreQO = queryOptions({
  queryKey: ["angler-explore"],
  queryFn: () => getAnglerExplore(),
});

type ExploreData = Awaited<ReturnType<typeof getAnglerExplore>>;
type Service = ExploreData["featured"][number];

const money = (cents: number) =>
  `$${(Math.max(0, cents) / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const FALLBACK = "/dashboards/assets/seascape.jpg";

const dark: React.CSSProperties = {
  background: "linear-gradient(180deg,#0a2236 0%,#071a2a 100%)",
  color: "#eaf1f6",
  borderRadius: 22,
  padding: "clamp(20px,4vw,40px)",
};

const eyebrow: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: ".2em",
  textTransform: "uppercase",
  color: "var(--sand)",
};

const serifHead: React.CSSProperties = {
  fontFamily: "var(--serif)",
  fontWeight: 600,
  fontSize: "clamp(22px,3vw,30px)",
  lineHeight: 1.1,
  color: "#fff",
  margin: 0,
};

function Rule({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, margin: "40px 0 20px" }}>
      <span style={{ height: 1, flex: 1, background: "rgba(255,255,255,.12)" }} />
      <span style={eyebrow}>{label}</span>
      <span style={{ height: 1, flex: 1, background: "rgba(255,255,255,.12)" }} />
    </div>
  );
}

function SectionHead({ title, note, action }: { title: string; note?: string; action?: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
        borderBottom: "1px solid rgba(255,255,255,.08)",
        paddingBottom: 14,
        marginBottom: 20,
      }}
    >
      <h3 style={serifHead}>{title}</h3>
      {note && <span style={{ fontSize: 13, color: "var(--ondmut)" }}>{note}</span>}
      {action}
    </div>
  );
}

function rating(data: ExploreData, businessId?: string | null) {
  if (!businessId) return null;
  return data.ratings[businessId] ?? null;
}

function HeroCard({ s, r }: { s: Service; r: { avg: number; count: number } | null }) {
  return (
    <Link
      to="/booking"
      search={{ service_id: s.id }}
      style={{
        position: "relative",
        display: "block",
        borderRadius: 20,
        overflow: "hidden",
        minHeight: 420,
        textDecoration: "none",
        color: "#fff",
        border: "1px solid rgba(227,192,137,.28)",
        boxShadow: "0 24px 60px -30px rgba(0,0,0,.8)",
      }}
    >
      <img
        src={s.hero_url || FALLBACK}
        alt={s.title}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg,rgba(7,26,42,.15) 20%,rgba(7,26,42,.92) 92%)",
        }}
      />
      <div style={{ position: "relative", padding: "clamp(18px,3vw,28px)", display: "flex", flexDirection: "column", height: "100%", minHeight: 420, justifyContent: "flex-end" }}>
        <span style={{ ...eyebrow, marginBottom: 8 }}>Featured charter</span>
        <h4 style={{ ...serifHead, fontSize: "clamp(26px,3.4vw,36px)", marginBottom: 8 }}>{s.title}</h4>
        <p style={{ margin: "0 0 16px", fontSize: 13.5, color: "#cbd9e4" }}>
          {s.business?.name} · {[s.business?.city, s.business?.region].filter(Boolean).join(", ") || s.departure_location || "—"}
          {r ? ` · ★ ${r.avg} (${r.count})` : ""}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <span style={{ fontFamily: "var(--serif)", fontSize: 24, color: "var(--sand)" }}>{money(s.base_price_cents)}</span>
          <span
            style={{
              background: "var(--sand)",
              color: "#0a2236",
              fontSize: 12.5,
              fontWeight: 700,
              borderRadius: 999,
              padding: "10px 18px",
            }}
          >
            Book this trip
          </span>
        </div>
      </div>
    </Link>
  );
}

function TallCard({ s, r }: { s: Service; r: { avg: number; count: number } | null }) {
  return (
    <Link
      to="/booking"
      search={{ service_id: s.id }}
      style={{
        display: "flex",
        flexDirection: "column",
        borderRadius: 18,
        overflow: "hidden",
        textDecoration: "none",
        background: "rgba(255,255,255,.04)",
        border: "1px solid rgba(255,255,255,.08)",
        color: "#eaf1f6",
      }}
    >
      <div style={{ height: 160, overflow: "hidden" }}>
        <img src={s.hero_url || FALLBACK} alt={s.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
        <div style={{ fontSize: 12, color: "var(--ondmut)" }}>
          {[s.business?.city, s.business?.region].filter(Boolean).join(", ") || s.departure_location || "—"}
          {r ? ` · ★ ${r.avg}` : ""}
        </div>
        <div style={{ fontFamily: "var(--serif)", fontSize: 19, color: "#fff", lineHeight: 1.15 }}>{s.title}</div>
        <div style={{ marginTop: "auto", fontSize: 12.5, color: "var(--ondmut)" }}>
          from <b style={{ fontFamily: "var(--serif)", fontSize: 17, color: "var(--sand)" }}>{money(s.base_price_cents)}</b>
        </div>
      </div>
    </Link>
  );
}

function MiniCard({ s, r }: { s: Service; r: { avg: number; count: number } | null }) {
  return (
    <Link to="/booking" search={{ service_id: s.id }} style={{ textDecoration: "none", color: "#eaf1f6", display: "grid", gap: 10 }}>
      <div style={{ height: 150, borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,.08)" }}>
        <img src={s.hero_url || FALLBACK} alt={s.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
      <div>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{s.title}</div>
        <div style={{ fontSize: 12, color: "var(--ondmut)" }}>
          {s.business?.name}
          {r ? ` · ${r.avg} ★` : ""}
        </div>
      </div>
    </Link>
  );
}

export function ExploreTab() {
  const { data } = useSuspenseQuery(anglerExploreQO);
  const [hero, ...rest] = data.featured;
  const where = [data.city, data.region].filter(Boolean).join(", ");

  return (
    <div style={dark}>
      <div style={{ marginBottom: 24 }}>
        <span style={eyebrow}>Explore</span>
        <h2 style={{ ...serifHead, fontSize: "clamp(28px,4.4vw,44px)", margin: "6px 0 8px" }}>
          Find your next day on the water
        </h2>
        <p style={{ margin: 0, fontSize: 14, color: "var(--ondmut)", maxWidth: 620 }}>
          Verified captains, escrow-protected payments, and trips curated from the Fish-X fleet.{" "}
          <Link to="/marketplace" style={{ color: "var(--sand)", fontWeight: 600 }}>
            Open full marketplace →
          </Link>
        </p>
      </div>

      {data.featured.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--ondmut)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 18 }}>
          No published charters yet.
        </div>
      ) : (
        <div className="explore-hero-grid" style={{ display: "grid", gridTemplateColumns: "1.35fr 1fr", gap: 18 }}>
          {hero && <HeroCard s={hero} r={rating(data, hero.business?.id)} />}
          <div style={{ display: "grid", gridTemplateRows: "1fr 1fr", gap: 18 }}>
            {rest.slice(0, 2).map((s) => (
              <TallCard key={s.id} s={s} r={rating(data, s.business?.id)} />
            ))}
          </div>
        </div>
      )}

      {rest.length > 2 && (
        <>
          <div style={{ height: 44 }} />
          <SectionHead title="Fresh on the dock" note={`${rest.length - 2} new listings`} />
          <div className="explore-quad" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 18 }}>
            {rest.slice(2).map((s) => (
              <MiniCard key={s.id} s={s} r={rating(data, s.business?.id)} />
            ))}
          </div>
        </>
      )}

      {data.nearby.length > 0 && (
        <>
          <div style={{ height: 44 }} />
          <SectionHead
            title="Charters near you"
            note={where ? `Showing results for ${where}` : "Based on the latest listings"}
          />
          <div className="explore-quad" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 18 }}>
            {data.nearby.slice(0, 4).map((s) => (
              <MiniCard key={s.id} s={s} r={rating(data, s.business?.id)} />
            ))}
          </div>
        </>
      )}

      {data.topCaptains.length > 0 && (
        <>
          <div style={{ height: 44 }} />
          <SectionHead title="Top rated captains" />
          <div className="explore-triple" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18 }}>
            {data.topCaptains.map((b) => (
              <Link
                key={b.id}
                to="/b/$slug"
                params={{ slug: b.slug }}
                style={{
                  display: "flex",
                  gap: 14,
                  alignItems: "center",
                  padding: 16,
                  borderRadius: 16,
                  textDecoration: "none",
                  color: "#eaf1f6",
                  background: "rgba(255,255,255,.04)",
                  border: "1px solid rgba(255,255,255,.08)",
                }}
              >
                <img
                  src={b.logo_url || b.hero_url || FALLBACK}
                  alt={b.name}
                  style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", border: "1px solid rgba(227,192,137,.35)" }}
                />
                <div>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 18, color: "#fff" }}>{b.name}</div>
                  <div style={{ fontSize: 12.5, color: "var(--ondmut)" }}>
                    {[b.city, b.region].filter(Boolean).join(", ") || b.tagline || "—"}
                    {b.avg_rating ? ` · ★ ${b.avg_rating} (${b.review_count})` : ""}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {data.highlights.length > 0 && (
        <>
          <Rule label="Catch highlights" />
          <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 8 }}>
            {data.highlights.map((h) => (
              <div
                key={h.id}
                title={h.caption}
                style={{
                  flex: "none",
                  width: 132,
                  height: 132,
                  borderRadius: "50%",
                  padding: 4,
                  border: "2px solid rgba(227,192,137,.4)",
                }}
              >
                <img src={h.url} alt={h.caption || "Catch"} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
