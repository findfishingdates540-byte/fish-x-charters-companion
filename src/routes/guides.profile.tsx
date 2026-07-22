import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/guides/profile")({
  beforeLoad: () => {
    throw redirect({ to: "/discover", search: { category: "guide_service" } });
  },
  component: () => null,
});
