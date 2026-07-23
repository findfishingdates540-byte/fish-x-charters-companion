import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getBusinessProfile } from "@/lib/businesses.functions";
import { OperatorProfile } from "@/components/profile/OperatorProfile";

const profileQO = (slug: string) =>
  queryOptions({
    queryKey: ["business-profile", slug],
    queryFn: async () => {
      try {
        return await getBusinessProfile({ data: { slug } });
      } catch (e) {
        if (e instanceof Response && e.status === 404) throw notFound();
        throw e;
      }
    },
  });

export const Route = createFileRoute("/b/$slug")({
  loader: async ({ context, params }) => {
    return await context.queryClient.ensureQueryData(profileQO(params.slug));
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Operator not found — Fish-X Charters" }, { name: "robots", content: "noindex" }] };
    }
    const b = loaderData.business;
    const location = [b.city, b.region, b.country].filter(Boolean).join(", ");
    const title = `${b.name}${location ? ` — ${location}` : ""} · Fish-X Charters`;
    const description =
      b.tagline ??
      (b.description ? b.description.slice(0, 155) : `Book ${b.name} on Fish-X — verified reviews, live availability, escrow-protected payment.`);
    const meta: Array<Record<string, string>> = [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ];
    if (b.hero_url && /^https?:\/\//.test(b.hero_url)) {
      meta.push({ property: "og:image", content: b.hero_url });
      meta.push({ name: "twitter:image", content: b.hero_url });
    }
    return { meta };
  },
  component: BusinessPage,
  errorComponent: ({ error }) => (
    <div style={{ padding: 40, fontFamily: "'Hanken Grotesk',system-ui,sans-serif" }}>
      Couldn't load operator: {error.message}
    </div>
  ),
  notFoundComponent: () => (
    <div style={{ padding: 60, textAlign: "center", fontFamily: "'Hanken Grotesk',system-ui,sans-serif" }}>
      <h1 style={{ fontFamily: "'Cormorant Garamond',Georgia,serif" }}>Operator not found</h1>
      <Link to="/discover" search={{}}>Back to directory →</Link>
    </div>
  ),
});

function BusinessPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(profileQO(slug));
  const variant: "captain" | "guide" =
    data.business.category_key === "guide_service" ? "guide" : "captain";
  return <OperatorProfile {...data} variant={variant} />;
}
