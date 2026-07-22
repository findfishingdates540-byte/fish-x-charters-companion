import { createFileRoute } from "@tanstack/react-router";
import { DashboardFrame } from "@/components/DashboardFrame";

export const Route = createFileRoute("/marketplace")({
  head: () => ({
    meta: [
      { title: "Marketplace — Fish-X Charters" },
      { name: "description", content: "Discover charter captains, tackle shops, marinas, guides, and gear across the Fish-X ecosystem." },
      { property: "og:title", content: "Marketplace — Fish-X Charters" },
      { property: "og:description", content: "Browse verified fishing operators on Fish-X Charters." },
    ],
  }),
  component: () => <DashboardFrame src="/dashboards/marketplace.html" title="Marketplace" />,
});
