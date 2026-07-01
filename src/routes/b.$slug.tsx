import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getBusinessBySlug } from "@/lib/businesses.functions";

const bizQO = (slug: string) =>
  queryOptions({
    queryKey: ["business", slug],
    queryFn: async () => {
      try {
        return await getBusinessBySlug({ data: { slug } });
      } catch (e) {
        if (e instanceof Response && e.status === 404) throw notFound();
        throw e;
      }
    },
  });

export const Route = createFileRoute("/b/$slug")({
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(bizQO(params.slug));
  },
  head: ({ loaderData: _l, params }) => ({
    meta: [
      { title: `${params.slug} — Fish-X` },
      { property: "og:title", content: `${params.slug} — Fish-X` },
    ],
  }),
  component: BusinessPage,
  errorComponent: ({ error }) => <div className="p-10">Error: {error.message}</div>,
  notFoundComponent: () => (
    <div style={{ padding: 60, textAlign: "center", fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}>
      <h1>Operator not found</h1>
      <Link to="/discover">Back to directory →</Link>
    </div>
  ),
});

function BusinessPage() {
  const { slug } = Route.useParams();
  const { data: b } = useSuspenseQuery(bizQO(slug));

  return (
    <div style={{ background: "#f4f6f8", minHeight: "100vh", fontFamily: "'Hanken Grotesk', system-ui, sans-serif", color: "#0d2236" }}>
      <div style={{ height: 320, background: b.hero_url ? `#e9edf1 url(${b.hero_url}) center/cover` : "linear-gradient(135deg,#0a2236,#06151f)", position: "relative" }}>
        <Link to="/discover" style={{ position: "absolute", top: 24, left: 32, color: "#fff", textDecoration: "none", background: "rgba(0,0,0,.35)", padding: "8px 16px", borderRadius: 999, fontSize: 13 }}>← Directory</Link>
      </div>

      <div style={{ maxWidth: 1100, margin: "-60px auto 0", padding: "0 32px 80px" }}>
        <div style={{ background: "#fff", borderRadius: 20, padding: "36px 40px", border: "1px solid rgba(13,34,54,.08)", boxShadow: "0 10px 40px -20px rgba(13,34,54,.2)" }}>
          <div style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "#b88c46", fontWeight: 700 }}>
            {b.category_key.replace(/_/g, " ")}
            {b.verified_at && <span style={{ marginLeft: 10, color: "#0d2236" }}>· Verified operator</span>}
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "clamp(36px,4.5vw,56px)", letterSpacing: "-.02em", margin: "10px 0 6px", fontWeight: 600 }}>
            {b.name}
          </h1>
          {b.tagline && <div style={{ color: "#5c6b78", fontSize: 17 }}>{b.tagline}</div>}
          {(b.city || b.country) && (
            <div style={{ color: "#5c6b78", fontSize: 14, marginTop: 12 }}>
              📍 {[b.address, b.city, b.region, b.country].filter(Boolean).join(", ")}
            </div>
          )}

          <div style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap" }}>
            <button style={cta("primary")}>Message operator</button>
            <button style={cta("secondary")}>Follow</button>
            {b.website && (
              <a href={b.website} target="_blank" rel="noreferrer" style={{ ...cta("secondary"), textDecoration: "none" }}>Website ↗</a>
            )}
          </div>
        </div>

        {b.description && (
          <section style={{ marginTop: 32, background: "#fff", borderRadius: 16, padding: 32, border: "1px solid rgba(13,34,54,.08)" }}>
            <h2 style={sectionTitle}>About</h2>
            <p style={{ color: "#0d2236", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{b.description}</p>
          </section>
        )}

        <section style={{ marginTop: 32, background: "#fff", borderRadius: 16, padding: 32, border: "1px solid rgba(13,34,54,.08)" }}>
          <h2 style={sectionTitle}>Posts</h2>
          <p style={{ color: "#5c6b78" }}>The operator's feed appears here once they post.</p>
        </section>

        <section style={{ marginTop: 32, background: "#fff", borderRadius: 16, padding: 32, border: "1px solid rgba(13,34,54,.08)" }}>
          <h2 style={sectionTitle}>Bookable services</h2>
          <p style={{ color: "#5c6b78" }}>Charters, guided trips, slips, workshops — the operator's services will list here.</p>
        </section>
      </div>
    </div>
  );
}

const sectionTitle: React.CSSProperties = {
  fontFamily: "'Cormorant Garamond', Georgia, serif",
  fontSize: 28,
  fontWeight: 600,
  margin: "0 0 16px",
};

function cta(kind: "primary" | "secondary"): React.CSSProperties {
  const primary = kind === "primary";
  return {
    padding: "12px 22px",
    borderRadius: 12,
    background: primary ? "#e3c089" : "#fff",
    color: primary ? "#1c1303" : "#0d2236",
    border: primary ? "0" : "1px solid rgba(13,34,54,.15)",
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: ".14em",
    textTransform: "uppercase",
    cursor: "pointer",
  };
}
