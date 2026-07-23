import { createFileRoute, useSearch } from "@tanstack/react-router";
import { z } from "zod";
import { ResolutionCenter } from "@/components/resolution/ResolutionCenter";
import { getResolutionContext, listDisputableBookings } from "@/lib/resolution.functions";

const searchSchema = z.object({ booking: z.string().uuid().optional() });

export const Route = createFileRoute("/_authenticated/resolution-center")({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  loaderDeps: ({ search }) => ({ booking: search.booking }),
  loader: ({ context, deps }) =>
    deps.booking
      ? context.queryClient.ensureQueryData({
          queryKey: ["resolution", deps.booking],
          queryFn: () => getResolutionContext({ data: { bookingId: deps.booking! } }),
        })
      : context.queryClient.ensureQueryData({
          queryKey: ["disputable-bookings"],
          queryFn: () => listDisputableBookings(),
        }),
  head: () => ({
    meta: [
      { title: "Resolution center — Fish-X Charters" },
      {
        name: "description",
        content: "Open or track a case on your booking. Your money stays safe in escrow throughout.",
      },
      { property: "og:title", content: "Resolution center — Fish-X Charters" },
      { property: "og:description", content: "Fair, fast dispute resolution — escrow protected." },
    ],
  }),
  component: ResolutionCenterPage,
  errorComponent: ({ error }) => (
    <div style={{ padding: 40, fontFamily: "'Hanken Grotesk',system-ui,sans-serif" }}>
      <h1>Couldn't load the Resolution Center</h1>
      <p>{error instanceof Error ? error.message : "Unknown error"}</p>
    </div>
  ),
  notFoundComponent: () => <div style={{ padding: 40 }}>Booking not found.</div>,
});

function ResolutionCenterPage() {
  const { booking } = useSearch({ from: "/_authenticated/resolution-center" });
  return <ResolutionCenter bookingId={booking ?? null} />;
}
