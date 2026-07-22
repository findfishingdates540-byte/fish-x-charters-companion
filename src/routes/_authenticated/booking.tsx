import { createFileRoute } from "@tanstack/react-router";
import { DashboardFrame } from "@/components/DashboardFrame";

export const Route = createFileRoute("/_authenticated/booking")({
  head: () => ({ meta: [{ title: "Booking — Fish-X Charters" }] }),
  component: () => <DashboardFrame src="/dashboards/booking.html" title="Booking" />,
});
