import { createFileRoute } from "@tanstack/react-router";
import { DashboardFrame } from "@/components/DashboardFrame";

export const Route = createFileRoute("/_authenticated/bookings/detail")({
  head: () => ({ meta: [{ title: "Booking detail — Fish-X Charters" }] }),
  component: () => <DashboardFrame src="/dashboards/captain-booking-detail.html" title="Booking detail" />,
});
