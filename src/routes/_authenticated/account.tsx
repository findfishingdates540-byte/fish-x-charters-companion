import { createFileRoute } from "@tanstack/react-router";
import { AnglerAccount } from "@/components/profile/AnglerAccount";
import { getMyProfile } from "@/lib/angler-profile.functions";

export const Route = createFileRoute("/_authenticated/account")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({
      queryKey: ["my-profile"],
      queryFn: () => getMyProfile(),
    }),
  head: () => ({
    meta: [
      { title: "Account — Fish-X Charters" },
      {
        name: "description",
        content: "Manage your Fish-X angler account — your name, contact details and avatar.",
      },
      { property: "og:title", content: "Account — Fish-X Charters" },
      { property: "og:description", content: "Manage your Fish-X angler account details." },
    ],
  }),
  component: AccountPage,
  errorComponent: ({ error }) => (
    <div style={{ padding: 40, fontFamily: "'Hanken Grotesk',system-ui,sans-serif" }}>
      <h1>Couldn't load your account</h1>
      <p>{error instanceof Error ? error.message : "Unknown error"}</p>
    </div>
  ),
  notFoundComponent: () => <div style={{ padding: 40 }}>Account not found.</div>,
});

function AccountPage() {
  return <AnglerAccount />;
}
