import { createFileRoute, useSearch } from "@tanstack/react-router";
import { z } from "zod";
import { PayoutsStates, type PayoutState } from "@/components/onboarding/PayoutsStates";

const searchSchema = z.object({
  state: z.enum(["verifying", "verified", "action"]).optional(),
});

export const Route = createFileRoute("/_authenticated/payouts-status")({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Payouts verification — Fish-X Charters" },
      {
        name: "description",
        content: "Connect and verify your payout account so your charter earnings land safely.",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&family=Source+Serif+4:opsz,wght@8..60,400..700&display=swap",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,100..700,0..1,0..1&display=swap",
      },
    ],
  }),
  component: PayoutsStatusPage,
});

function PayoutsStatusPage() {
  const { state } = useSearch({ from: "/_authenticated/payouts-status" });
  return <PayoutsStates state={(state as PayoutState) ?? "verifying"} />;
}
