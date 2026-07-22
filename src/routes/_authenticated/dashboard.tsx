import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useEffect } from "react";
import { getMyRoles, hasPrimaryRole, getMyProfile } from "@/lib/auth.functions";
import { getMyBusinesses } from "@/lib/my-businesses.functions";
import { DashboardFrame } from "@/components/DashboardFrame";
import { AnglerDashboard } from "@/components/angler/AnglerDashboard";
import { CaptainDashboard } from "@/components/captain/CaptainDashboard";
import { MarinaDashboard } from "@/components/marina/MarinaDashboard";
import { ShopDashboard } from "@/components/tackle/ShopDashboard";
import {
  getAnglerDashboard,
  listRecommendedCharters,
} from "@/lib/angler-dashboard.functions";
import { getCaptainDashboard } from "@/lib/captain-dashboard.functions";
import { getMarinaOverview } from "@/lib/marina.functions";
import { getShopOverview } from "@/lib/tackle.functions";

const myRolesQO = queryOptions({
  queryKey: ["my-roles"],
  queryFn: () => getMyRoles(),
});

const myBusinessesQO = queryOptions({
  queryKey: ["my-businesses"],
  queryFn: () => getMyBusinesses(),
});

const myProfileQO = queryOptions({
  queryKey: ["my-profile"],
  queryFn: () => getMyProfile(),
});

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
    const [roles] = await Promise.all([
      context.queryClient.ensureQueryData(myRolesQO),
      context.queryClient.ensureQueryData(myBusinessesQO),
    ]);
    const primary = hasPrimaryRole(roles);
    if (primary === "angler") {
      await Promise.all([
        context.queryClient.ensureQueryData({
          queryKey: ["angler-dashboard"],
          queryFn: () => getAnglerDashboard(),
        }),
        context.queryClient.ensureQueryData({
          queryKey: ["angler-recos"],
          queryFn: () => listRecommendedCharters(),
        }),
      ]);
    } else if (primary === "captain" || primary === "business_owner") {
      await context.queryClient.ensureQueryData({
        queryKey: ["captain-dashboard"],
        queryFn: () => getCaptainDashboard(),
      });
    }
  },
  component: Dashboard,
  errorComponent: ({ error }) => (
    <div style={{ padding: 40, fontFamily: "system-ui" }}>
      <h1>Dashboard error</h1>
      <p>{(error as Error).message}</p>
    </div>
  ),
});

// Map an operator's business category to its DC dashboard template.
const categoryTemplate: Record<string, string> = {
  charter: "captain",
  tackle_shop: "tackle",
  bait_shop: "tackle",
  marina: "marina",
  lodge: "marina",
  apparel: "apparel",
  gear_mfg: "manufacturer",
  guide_service: "guide",
};

function Dashboard() {
  const { data: roles } = useSuspenseQuery(myRolesQO);
  const { data: businesses } = useSuspenseQuery(myBusinessesQO);
  const navigate = useNavigate();
  const primaryRole = hasPrimaryRole(roles);

  useEffect(() => {
    if (
      (primaryRole === "business_owner" || primaryRole === "captain") &&
      businesses.length === 0
    ) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [primaryRole, businesses, navigate]);

  if (primaryRole === "angler") {
    return <AnglerDashboard />;
  }

  if (primaryRole === "captain") {
    return <CaptainDashboard />;
  }

  if (primaryRole === "business_owner") {
    const categoryKey = businesses[0]?.business?.category_key as string | undefined;
    // Charter operators use the React captain dashboard; other verticals still use DC templates for now.
    if (!categoryKey || categoryKey === "charter") return <CaptainDashboard />;
    const slug = categoryTemplate[categoryKey] ?? "captain";
    return <DashboardFrame src={`/dashboards/${slug}.html`} title="Operator dashboard" />;
  }

  return <DashboardFrame src="/dashboards/angler.html" title="Dashboard" />;
}

