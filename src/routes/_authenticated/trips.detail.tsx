import { createFileRoute, useSearch } from "@tanstack/react-router";
import { z } from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import { TripDetail } from "@/components/angler/TripDetail";
import { getTripDetail } from "@/lib/trip-detail.functions";

const searchSchema = z.object({ id: z.string().uuid() });

export const Route = createFileRoute("/_authenticated/trips/detail")({
  validateSearch: zodValidator(searchSchema),
  loaderDeps: ({ search }) => ({ id: search.id }),
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData({
      queryKey: ["trip-detail", deps.id],
      queryFn: () => getTripDetail({ data: { id: deps.id } }),
    }),
  head: () => ({
    meta: [
      { title: "Trip details — Fish-X Charters" },
      { name: "description", content: "Your booking, escrow status, captain messages, and cancellation options." },
      { property: "og:title", content: "Trip details — Fish-X Charters" },
      { property: "og:description", content: "Everything you need to know before you cast off." },
    ],
  }),
  component: TripDetailPage,
  errorComponent: ({ error }) => (
    <div style={{ padding: 40, fontFamily: "'Hanken Grotesk',system-ui,sans-serif" }}>
      <h1>Couldn't load trip</h1>
      <p>{error instanceof Error ? error.message : "Unknown error"}</p>
    </div>
  ),
  notFoundComponent: () => <div style={{ padding: 40 }}>Trip not found.</div>,
});

function TripDetailPage() {
  const { id } = useSearch({ from: "/_authenticated/trips/detail" });
  return <TripDetail bookingId={id} />;
}
