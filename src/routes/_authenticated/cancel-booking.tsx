import { createFileRoute, useSearch } from "@tanstack/react-router";
import { z } from "zod";
import { CancelBooking } from "@/components/booking/CancelBooking";
import { getCancelContext } from "@/lib/cancel-booking.functions";

const searchSchema = z.object({ booking: z.string().uuid() });

export const Route = createFileRoute("/_authenticated/cancel-booking")({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  loaderDeps: ({ search }) => ({ booking: search.booking }),
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData({
      queryKey: ["cancel-booking", deps.booking],
      queryFn: () => getCancelContext({ data: { bookingId: deps.booking } }),
    }),
  head: () => ({
    meta: [
      { title: "Cancel booking — Fish-X Charters" },
      {
        name: "description",
        content: "Cancel your charter booking. Your money stays safe in escrow throughout.",
      },
      { property: "og:title", content: "Cancel booking — Fish-X Charters" },
      { property: "og:description", content: "Review the details and finalize your cancellation." },
    ],
  }),
  component: CancelBookingPage,
  errorComponent: ({ error }) => (
    <div style={{ padding: 40, fontFamily: "'Hanken Grotesk',system-ui,sans-serif" }}>
      <h1>Couldn't load this booking</h1>
      <p>{error instanceof Error ? error.message : "Unknown error"}</p>
    </div>
  ),
  notFoundComponent: () => <div style={{ padding: 40 }}>Booking not found.</div>,
});

function CancelBookingPage() {
  const { booking } = useSearch({ from: "/_authenticated/cancel-booking" });
  return <CancelBooking bookingId={booking} />;
}
