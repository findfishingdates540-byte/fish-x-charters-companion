import { createFileRoute, useSearch } from "@tanstack/react-router";
import { z } from "zod";
import { CaptainBookingDetail } from "@/components/captain/CaptainBookingDetail";
import { getCaptainBooking } from "@/lib/captain-booking-detail.functions";

const searchSchema = z.object({ id: z.string().uuid() });

export const Route = createFileRoute("/_authenticated/bookings/detail")({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  loaderDeps: ({ search }) => ({ id: search.id }),
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData({
      queryKey: ["captain-booking", deps.id],
      queryFn: () => getCaptainBooking({ data: { id: deps.id } }),
    }),
  head: () => ({ meta: [{ title: "Booking detail — Fish-X Charters" }] }),
  component: BookingDetailPage,
  errorComponent: ({ error }) => (
    <div style={{ padding: 40, fontFamily: "'Hanken Grotesk',system-ui,sans-serif" }}>
      <h1>Couldn't load booking</h1>
      <p>{error instanceof Error ? error.message : "Unknown error"}</p>
    </div>
  ),
  notFoundComponent: () => <div style={{ padding: 40 }}>Booking not found.</div>,
});

function BookingDetailPage() {
  const { id } = useSearch({ from: "/_authenticated/bookings/detail" });
  return <CaptainBookingDetail bookingId={id} />;
}
