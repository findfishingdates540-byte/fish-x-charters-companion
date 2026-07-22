import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { BookingFlow, checkoutQuery } from "@/components/booking/BookingFlow";

const search = z.object({ service_id: z.string().uuid() });

export const Route = createFileRoute("/_authenticated/booking")({
  head: () => ({
    meta: [
      { title: "Book your trip — Fish-X Charters" },
      { name: "description", content: "Secure your fishing charter with Fish-X — every booking escrow-protected." },
      { property: "og:title", content: "Book your trip — Fish-X Charters" },
      { property: "og:description", content: "Escrow-protected charter booking on Fish-X." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: search,
  loaderDeps: ({ search }) => ({ serviceId: search.service_id }),
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(checkoutQuery(deps.serviceId)),
  component: RouteComponent,
});

function RouteComponent() {
  const { service_id } = Route.useSearch();
  return <BookingFlow serviceId={service_id} />;
}
