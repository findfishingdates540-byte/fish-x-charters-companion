import { createFileRoute } from "@tanstack/react-router";
import { DashboardFrame } from "@/components/DashboardFrame";

export const Route = createFileRoute("/trips/detail")({
  head: () => ({
    meta: [
      { title: "Trip details — Fish-X Charters" },
      { name: "description", content: "Full trip breakdown: itinerary, captain, boat, target species, and escrowed booking terms." },
      { property: "og:title", content: "Trip details — Fish-X Charters" },
      { property: "og:description", content: "Everything you need to know before you cast off." },
    ],
  }),
  component: () => <DashboardFrame src="/dashboards/trip-detail.html" title="Trip details" />,
});
