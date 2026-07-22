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
    await context.queryClient.ensureQueryData(profileQO(params.slug));
  },
  head: ({ params, loaderData: _l }) => ({
    meta: [
      { title: `${params.slug} — Fish-X Charters` },
      { name: "description", content: `Book this Fish-X operator: verified reviews, live availability, escrow-protected payment.` },
      { property: "og:title", content: `${params.slug} — Fish-X Charters` },
      { property: "og:description", content: `Explore trips, reviews, and availability from this verified Fish-X operator.` },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BusinessPage,
  errorComponent: ({ error }) => (
    <div style={{ padding: 40, fontFamily: "'Hanken Grotesk',system-ui,sans-serif" }}>
      Couldn't load operator: {error.message}
    </div>
  ),
  notFoundComponent: () => (
    <div style={{ padding: 60, textAlign: "center", fontFamily: "'Hanken Grotesk',system-ui,sans-serif" }}>
      <h1 style={{ fontFamily: "'Cormorant Garamond',Georgia,serif" }}>Operator not found</h1>
      <Link to="/discover">Back to directory →</Link>
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
