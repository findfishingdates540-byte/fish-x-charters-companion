import { createFileRoute } from "@tanstack/react-router";
import { DashboardFrame } from "@/components/DashboardFrame";

export const Route = createFileRoute("/_authenticated/resolution-center")({
  head: () => ({ meta: [{ title: "Resolution center — Fish-X Charters" }] }),
  component: () => <DashboardFrame src="/dashboards/resolution-center.html" title="Resolution center" />,
});
