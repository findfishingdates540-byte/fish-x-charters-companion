import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Fish-X Charters" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = Route.useRouteContext();
  const name = (user.user_metadata?.full_name as string | undefined) ?? user.email;

  return (
    <div className="px-6 md:px-12 py-10 max-w-6xl">
      <p className="text-label-caps text-sandy-gold">At the helm</p>
      <h1 className="mt-3 text-display text-4xl md:text-5xl">Welcome aboard, {name}</h1>
      <p className="mt-3 text-on-deep-muted max-w-xl">
        Your captain workspace is ready. The foundation is in place — auth,
        design system, and database. Next we'll wire up bookings, trips,
        boats, and the Fish-X bridge.
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {[
          { icon: "event_upcoming", label: "Today's trips", value: "0" },
          { icon: "payments", label: "Pending payouts", value: "$0" },
          { icon: "mark_email_unread", label: "New inquiries", value: "0" },
        ].map((stat) => (
          <div key={stat.label} className="glass-card p-6">
            <span className="material-symbols-outlined text-sandy-gold">{stat.icon}</span>
            <div className="mt-4 text-display text-3xl">{stat.value}</div>
            <div className="mt-1 text-label-caps text-on-deep-muted">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-10 glass-card p-8">
        <h2 className="text-display text-2xl">Foundation shipped</h2>
        <ul className="mt-4 space-y-2 text-sm text-on-deep-muted">
          <li className="flex gap-2"><span className="material-symbols-outlined text-sea-foam text-[18px]">check_circle</span> Supabase connected, RLS on every table</li>
          <li className="flex gap-2"><span className="material-symbols-outlined text-sea-foam text-[18px]">check_circle</span> Captain role auto-granted on signup via user_roles + has_role()</li>
          <li className="flex gap-2"><span className="material-symbols-outlined text-sea-foam text-[18px]">check_circle</span> Tables: profiles, boats, trip_templates, customers, bookings</li>
          <li className="flex gap-2"><span className="material-symbols-outlined text-sea-foam text-[18px]">check_circle</span> Maritime design tokens — sandy-gold, crisp-cyan, soft-coral, glass cards</li>
          <li className="flex gap-2"><span className="material-symbols-outlined text-sea-foam text-[18px]">check_circle</span> Fish-X API client stub at <code className="font-mono text-xs">src/lib/fishx-api.ts</code></li>
        </ul>
      </div>
    </div>
  );
}
