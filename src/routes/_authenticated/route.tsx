import { createFileRoute, Outlet, redirect, Link, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth", search: { redirect: location.href } });
    }
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user } = Route.useRouteContext();
  const router = useRouter();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border bg-card/40 backdrop-blur-xl">
        <div className="px-6 py-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-sandy-gold">anchor</span>
          <span className="text-label-caps">Charters</span>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {[
            { to: "/dashboard", icon: "dashboard", label: "Dashboard" },
            { to: "/onboarding", icon: "storefront", label: "Set up business" },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-on-deep-muted hover:bg-white/5 hover:text-on-deep transition"
              activeProps={{ className: "bg-sandy-gold/10 text-sandy-gold" }}
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-9 h-9 rounded-full bg-sandy-gold/20 flex items-center justify-center text-sandy-gold text-sm font-semibold">
              {(user.email ?? "C")[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-on-deep truncate">{user.email}</div>
              <button onClick={signOut} className="text-xs text-on-deep-muted hover:text-soft-coral">
                Sign out
              </button>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
