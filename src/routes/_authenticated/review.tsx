import { createFileRoute, useSearch } from "@tanstack/react-router";
import { z } from "zod";
import { LeaveReview } from "@/components/review/LeaveReview";
import { getReviewContext } from "@/lib/review.functions";

const searchSchema = z.object({ booking: z.string().uuid() });

export const Route = createFileRoute("/_authenticated/review")({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  loaderDeps: ({ search }) => ({ booking: search.booking }),
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData({
      queryKey: ["review", deps.booking],
      queryFn: () => getReviewContext({ data: { bookingId: deps.booking } }),
    }),
  head: () => ({
    meta: [
      { title: "Leave a review — Fish-X Charters" },
      {
        name: "description",
        content: "Rate your charter and share your story to help future anglers on Fish-X.",
      },
      { property: "og:title", content: "Leave a review — Fish-X Charters" },
      { property: "og:description", content: "Rate your captain and boat — verified booking review." },
    ],
  }),
  component: ReviewPage,
  errorComponent: ({ error }) => (
    <div style={{ padding: 40, fontFamily: "'Hanken Grotesk',system-ui,sans-serif" }}>
      <h1>Couldn't load the review screen</h1>
      <p>{error instanceof Error ? error.message : "Unknown error"}</p>
    </div>
  ),
  notFoundComponent: () => <div style={{ padding: 40 }}>Booking not found.</div>,
});

function ReviewPage() {
  const { booking } = useSearch({ from: "/_authenticated/review" });
  return <LeaveReview bookingId={booking} />;
}
