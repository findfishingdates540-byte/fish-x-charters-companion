import { createFileRoute, useSearch } from "@tanstack/react-router";
import { z } from "zod";
import { Messages } from "@/components/messages/Messages";
import { getThread, listMessageThreads } from "@/lib/messages.functions";

const searchSchema = z.object({ booking: z.string().uuid().optional() });

export const Route = createFileRoute("/_authenticated/messages")({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  loaderDeps: ({ search }) => ({ booking: search.booking }),
  loader: async ({ context, deps }) => {
    await context.queryClient.ensureQueryData({
      queryKey: ["message-threads"],
      queryFn: () => listMessageThreads(),
    });
    if (deps.booking) {
      await context.queryClient.ensureQueryData({
        queryKey: ["thread", deps.booking],
        queryFn: () => getThread({ data: { bookingId: deps.booking! } }),
      });
    }
  },
  head: () => ({
    meta: [
      { title: "Messages — Fish-X Charters" },
      {
        name: "description",
        content: "Message your captain about each booking — one thread per trip.",
      },
      { property: "og:title", content: "Messages — Fish-X Charters" },
      { property: "og:description", content: "Your conversations with each captain, tied to your bookings." },
    ],
  }),
  component: MessagesPage,
  errorComponent: ({ error }) => (
    <div style={{ padding: 40, fontFamily: "'Hanken Grotesk',system-ui,sans-serif" }}>
      <h1>Couldn't load Messages</h1>
      <p>{error instanceof Error ? error.message : "Unknown error"}</p>
    </div>
  ),
  notFoundComponent: () => <div style={{ padding: 40 }}>Conversation not found.</div>,
});

function MessagesPage() {
  const { booking } = useSearch({ from: "/_authenticated/messages" });
  return <Messages bookingId={booking ?? null} />;
}
