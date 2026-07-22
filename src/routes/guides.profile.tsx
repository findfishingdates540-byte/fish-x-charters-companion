import { createFileRoute } from "@tanstack/react-router";
import { DashboardFrame } from "@/components/DashboardFrame";

export const Route = createFileRoute("/guides/profile")({
  head: () => ({
    meta: [
      { title: "Guide profile — Fish-X Charters" },
      { name: "description", content: "Independent fishing guide bio, waters covered, trips, and reviews." },
      { property: "og:title", content: "Guide profile — Fish-X Charters" },
      { property: "og:description", content: "Meet a verified Fish-X guide." },
    ],
  }),
  component: () => <DashboardFrame src="/dashboards/guide-profile.html" title="Guide profile" />,
});
