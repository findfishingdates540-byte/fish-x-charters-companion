import { createFileRoute } from "@tanstack/react-router";
import { OperatorOnboarding } from "@/components/onboarding/OperatorOnboarding";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Set up your business — Fish-X Charters" }] }),
  component: OperatorOnboarding,
});
