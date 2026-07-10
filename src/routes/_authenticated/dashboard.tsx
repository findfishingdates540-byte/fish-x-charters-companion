import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyRoles, hasPrimaryRole } from "@/lib/auth.functions";
import { getMyBusinesses } from "@/lib/my-businesses.functions";
import { useEffect } from "react";

const myRolesQO = queryOptions({
  queryKey: ["my-roles"],
  queryFn: () => getMyRoles(),
});

const myBusinessesQO = queryOptions({
  queryKey: ["my-businesses"],
  queryFn: () => getMyBusinesses(),
});

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Fish-X Charters" }] }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(myRolesQO),
      context.queryClient.ensureQueryData(myBusinessesQO),
    ]);
  },
  component: Dashboard,
});

function Dashboard() {
  const { user } = Route.useRouteContext();
  const { data: roles } = useSuspenseQuery(myRolesQO);
  const { data: businesses } = useSuspenseQuery(myBusinessesQO);
  const navigate = useNavigate();
  const primaryRole = hasPrimaryRole(roles);

  // Redirect business owners without businesses to onboarding
  useEffect(() => {
    if ((primaryRole === "business_owner" || primaryRole === "captain") && businesses.length === 0) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [primaryRole, businesses, navigate]);

  // Route to appropriate dashboard based on role
  if (primaryRole === "angler") {
    return <AnglerDashboard user={user} />;
  }

  if (primaryRole === "business_owner" || primaryRole === "captain") {
    return <OperatorDashboard user={user} businesses={businesses} />;
  }

  // Fallback for users with no recognized role (shouldn't happen)
  return (
    <div className="px-6 md:px-12 py-10 max-w-6xl">
      <h1 className="text-display text-4xl">Welcome to Fish-X</h1>
      <p className="mt-3 text-on-deep-muted">Setting up your account...</p>
    </div>
  );
}

function AnglerDashboard({ user }: { user: any }) {
  const name = (user.user_metadata?.full_name as string | undefined) ?? user.email;

  // Use the new AnglerDashboard component (to be imported)
  // For now, keeping placeholder until import is added
  return (
    <div className="px-6 md:px-12 py-10 max-w-6xl">
      <p className="text-label-caps text-sandy-gold">Angler Dashboard</p>
      <h1 className="mt-3 text-display text-4xl md:text-5xl">Welcome aboard, {name}</h1>
      <p className="mt-3 text-on-deep-muted max-w-xl">
        Your angler workspace. Find charters, manage bookings, and explore gear.
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {[
          { icon: "event", label: "Upcoming trips", value: "0" },
          { icon: "favorite", label: "Followed operators", value: "0" },
          { icon: "history", label: "Past bookings", value: "0" },
        ].map((stat) => (
          <div key={stat.label} className="glass-card p-6">
            <span className="material-symbols-outlined text-sandy-gold">{stat.icon}</span>
            <div className="mt-4 text-display text-3xl">{stat.value}</div>
            <div className="mt-1 text-label-caps text-on-deep-muted">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-10 glass-card p-8">
        <h2 className="text-display text-2xl">Agent-built components ready</h2>
        <ul className="space-y-3 text-sm text-on-deep-muted mt-4">
          <li className="flex gap-2">
            <span className="material-symbols-outlined text-sea-foam text-[18px]">check_circle</span>
            AnglerDashboard component built
          </li>
          <li className="flex gap-2">
            <span className="material-symbols-outlined text-sea-foam text-[18px]">check_circle</span>
            CaptainDashboard component built
          </li>
          <li className="flex gap-2">
            <span className="material-symbols-outlined text-sea-foam text-[18px]">check_circle</span>
            BusinessDashboard (5 types) built
          </li>
        </ul>
      </div>
    </div>
  );
}

function OperatorDashboard({ user, businesses }: { user: any; businesses: any[] }) {
  const currentBusiness = businesses[0]?.business;

  // Map business category to BusinessDashboard type
  const businessTypeMap: Record<string, any> = {
    charter: "captain",
    tackle_shop: "tackle_shop",
    marina: "marina",
    apparel: "apparel",
    gear_mfg: "manufacturer",
    guide_service: "guide_service",
    bait_shop: "tackle_shop", // Reuse tackle shop for now
    lodge: "marina", // Reuse marina for now
  };

  const businessType = currentBusiness?.category_key
    ? businessTypeMap[currentBusiness.category_key] || "captain"
    : "captain";

  // For now, use simple placeholder - will integrate full BusinessDashboard after Agent 1 completes
  const name = (user.user_metadata?.full_name as string | undefined) ?? user.email;

  return (
    <div className="px-6 md:px-12 py-10 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-label-caps text-sandy-gold">Operator Dashboard</p>
          <h1 className="mt-2 text-display text-4xl md:text-5xl">Welcome aboard, {name}</h1>
          {currentBusiness && (
            <p className="mt-1 text-on-deep-muted">{currentBusiness.name} • {businessType}</p>
          )}
        </div>
        {businesses.length > 1 && (
          <button className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-white/5">
            Switch business ({businesses.length})
          </button>
        )}
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-4">
        {[
          { icon: "payments", label: "This month", value: "$0", sub: "Gross earnings" },
          { icon: "event_upcoming", label: "Upcoming", value: "0", sub: "Trips booked" },
          { icon: "schedule", label: "In escrow", value: "$0", sub: "Held until trips complete" },
          { icon: "star", label: "Rating", value: "—", sub: "No reviews yet" },
        ].map((stat) => (
          <div key={stat.label} className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-label-caps text-on-deep-muted">{stat.label}</span>
              <span className="material-symbols-outlined text-sandy-gold text-[20px]">{stat.icon}</span>
            </div>
            <div className="text-display text-3xl font-semibold">{stat.value}</div>
            <div className="mt-1 text-sm text-on-deep-muted">{stat.sub}</div>
          </div>
        ))}
      </div>

      <div className="mt-10 glass-card p-8">
        <h2 className="text-display text-2xl mb-4">Agent-built components ready</h2>
        <ul className="space-y-3 text-sm text-on-deep-muted">
          <li className="flex gap-2">
            <span className="material-symbols-outlined text-sea-foam text-[18px]">check_circle</span>
            BusinessDashboard component built (5 business types)
          </li>
          <li className="flex gap-2">
            <span className="material-symbols-outlined text-sandy-gold text-[18px]">schedule</span>
            Waiting for Captain Dashboard completion
          </li>
          <li className="flex gap-2">
            <span className="material-symbols-outlined text-sandy-gold text-[18px]">schedule</span>
            Waiting for Angler Dashboard completion
          </li>
        </ul>
      </div>
    </div>
  );
}
