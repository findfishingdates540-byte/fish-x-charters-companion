import { createFileRoute } from "@tanstack/react-router";
import { DashboardFrame } from "@/components/DashboardFrame";

export const Route = createFileRoute("/captains/profile")({
  head: () => ({
    meta: [
      { title: "Captain profile — Fish-X Charters" },
      { name: "description", content: "Verified captain bio, boat, trips, reviews, and availability." },
      { property: "og:title", content: "Captain profile — Fish-X Charters" },
      { property: "og:description", content: "Meet a verified Fish-X captain." },
    ],
  }),
  component: () => <DashboardFrame src="/dashboards/captain-profile.html" title="Captain profile" />,
});
