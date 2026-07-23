import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/captains/profile")({
  beforeLoad: () => {
    throw redirect({ to: "/discover", search: { category: "charter" } });
  },
  component: () => null,
});
