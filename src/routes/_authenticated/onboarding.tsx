import { createFileRoute } from "@tanstack/react-router";
import { DashboardFrame } from "@/components/DashboardFrame";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Set up your business — Fish-X Charters" }] }),
  component: () => (
    <DashboardFrame src="/dashboards/onboarding.html" title="Operator onboarding" />
  ),
});
