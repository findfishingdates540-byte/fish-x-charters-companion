import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { listPublicBusinesses, listCategories } from "@/lib/businesses.functions";

const businessesQO = (category?: string) =>
  queryOptions({
    queryKey: ["businesses", category ?? "all"],
    queryFn: () => listPublicBusinesses({ data: { category } }),
  });
const categoriesQO = queryOptions({
  queryKey: ["business-categories"],
  queryFn: () => listCategories(),
});

export const Route = createFileRoute("/discover")({
  head: () => ({
    meta: [
      { title: "Discover operators — Fish-X" },
      { name: "description", content: "Browse verified charter captains, tackle shops, marinas, guides, and gear brands across the Fish-X ecosystem." },
      { property: "og:title", content: "Discover fishing operators — Fish-X" },
      { property: "og:description", content: "Charters, tackle shops, marinas, guides, lodges, and gear brands." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    category: typeof s.category === "string" ? s.category : undefined,
  }),
  loaderDeps: ({ search }) => ({ category: search.category }),
  loader: async ({ context, deps }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(businessesQO(deps.category)),
      context.queryClient.ensureQueryData(categoriesQO),
    ]);
  },
  component: DiscoverPage,
  errorComponent: ({ error }) => (
    <div className="p-10">Couldn't load directory: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-10">Not found.</div>,
});

function DiscoverPage() {
  const { category } = Route.useSearch();
  const { data: businesses } = useSuspenseQuery(businessesQO(category));
  const { data: categories } = useSuspenseQuery(categoriesQO);

  return (
    <div style={{ background: "#f4f6f8", minHeight: "100vh", fontFamily: "'Hanken Grotesk', system-ui, sans-serif", color: "#0d2236" }}>
      <header style={{ padding: "40px 48px 24px", borderBottom: "1px solid rgba(13,34,54,.08)" }}>
        <Link to="/" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 22, fontWeight: 600, color: "#0d2236", textDecoration: "none" }}>Fish-X Charters</Link>
        <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "clamp(40px,5vw,64px)", letterSpacing: "-.02em", margin: "16px 0 8px", fontWeight: 600 }}>
          Discover operators.
        </h1>
        <p style={{ color: "#5c6b78", fontSize: 16, maxWidth: 560 }}>
          Every fishing-industry business inside Fish-X — charters, tackle shops, marinas, guides, lodges, apparel and gear brands.
        </p>
      </header>

      <nav style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "20px 48px", borderBottom: "1px solid rgba(13,34,54,.06)" }}>
        <Link
          to="/discover"
          search={{}}
          style={pill(!category)}
        >
          All
        </Link>
        {categories.map((c) => (
          <Link
            key={c.key}
            to="/discover"
            search={{ category: c.key }}
            style={pill(category === c.key)}
          >
            {c.label}
          </Link>
        ))}
      </nav>

      <section style={{ padding: "32px 48px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
        {businesses.length === 0 && (
          <div style={{ color: "#5c6b78", padding: "60px 0", textAlign: "center", gridColumn: "1 / -1" }}>
            No operators listed yet in this category.
          </div>
        )}
        {businesses.map((b) => (
          <Link
            key={b.id}
            to="/b/$slug"
            params={{ slug: b.slug }}
            style={{
              background: "#fff",
              border: "1px solid rgba(13,34,54,.08)",
              borderRadius: 16,
              overflow: "hidden",
              textDecoration: "none",
              color: "#0d2236",
              display: "flex",
              flexDirection: "column",
              transition: "transform .2s, box-shadow .2s",
            }}
          >
            <div style={{ aspectRatio: "4/3", background: b.hero_url ? `#e9edf1 url(${b.hero_url}) center/cover` : "linear-gradient(135deg,#0a2236,#06151f)" }} />
            <div style={{ padding: 18 }}>
              <div style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "#b88c46", fontWeight: 700 }}>
                {b.category_key.replace(/_/g, " ")}
                {b.verified_at && <span style={{ marginLeft: 8, color: "#0d2236" }}>· Verified</span>}
              </div>
              <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 24, fontWeight: 600, marginTop: 6 }}>{b.name}</div>
              {b.tagline && <div style={{ color: "#5c6b78", fontSize: 14, marginTop: 4 }}>{b.tagline}</div>}
              {(b.city || b.country) && (
                <div style={{ color: "#5c6b78", fontSize: 13, marginTop: 10 }}>
                  {[b.city, b.region, b.country].filter(Boolean).join(", ")}
                </div>
              )}
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}

function pill(active: boolean): React.CSSProperties {
  return {
    padding: "8px 16px",
    borderRadius: 999,
    background: active ? "#0d2236" : "#fff",
    color: active ? "#fff" : "#0d2236",
    border: "1px solid rgba(13,34,54,.10)",
    fontSize: 13,
    fontWeight: 600,
    textDecoration: "none",
  };
}
