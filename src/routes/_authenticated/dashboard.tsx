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


export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Fish-X Charters" }] }),
  loader: async ({ context }) => {
    const [roles, businesses] = await Promise.all([
      context.queryClient.ensureQueryData(myRolesQO),
      context.queryClient.ensureQueryData(myBusinessesQO),
      context.queryClient.ensureQueryData(myProfileQO),
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
      return;
    }
    if (primary === "captain" || primary === "business_owner") {
      const biz = businesses[0]?.business as { id: string; category_key: string } | undefined;
      const key = biz?.category_key;
      if (!biz || !key || key === "charter") {
        await context.queryClient.ensureQueryData({
          queryKey: ["captain-dashboard"],
          queryFn: () => getCaptainDashboard(),
        });
      } else if (key === "marina" || key === "lodge") {
        await context.queryClient.ensureQueryData({
          queryKey: ["marina-overview", biz.id],
          queryFn: () => getMarinaOverview({ data: { businessId: biz.id } }),
        });
      } else if (
        key === "tackle_shop" ||
        key === "bait_shop" ||
        key === "gear_mfg" ||
        key === "apparel"
      ) {
        await context.queryClient.ensureQueryData({
          queryKey: ["shop-overview", biz.id],
          queryFn: () => getShopOverview({ data: { businessId: biz.id } }),
        });
      }
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

// (categoryTemplate removed — verticals now use React components below.)

function Dashboard() {
  const { data: roles } = useSuspenseQuery(myRolesQO);
  const { data: businesses } = useSuspenseQuery(myBusinessesQO);
  const { data: profile } = useSuspenseQuery(myProfileQO);
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

  if (primaryRole === "angler") return <AnglerDashboard />;
  if (primaryRole === "captain") return <CaptainDashboard />;

  if (primaryRole === "business_owner") {
    const biz = businesses[0]?.business as
      | { id: string; name: string; category_key: string }
      | undefined;
    if (!biz) return <DashboardFrame src="/dashboards/onboarding.html" title="Onboarding" />;

    const operatorName =
      profile?.display_name || profile?.full_name || "Operator";
    const key = biz.category_key;

    if (!key || key === "charter") return <CaptainDashboard />;
    if (key === "marina" || key === "lodge")
      return (
        <MarinaDashboard
          businessId={biz.id}
          workspaceName={biz.name}
          operatorName={operatorName}
        />
      );
    if (
      key === "tackle_shop" ||
      key === "bait_shop" ||
      key === "gear_mfg" ||
      key === "apparel"
    )
      return (
        <ShopDashboard
          businessId={biz.id}
          workspaceName={biz.name}
          operatorName={operatorName}
          categoryKey={key}
        />
      );
    // Guide services and any other verticals still use DC templates for now.
    return <DashboardFrame src={`/dashboards/${key === "guide_service" ? "guide" : "captain"}.html`} title="Operator dashboard" />;
  }

  return <DashboardFrame src="/dashboards/angler.html" title="Dashboard" />;
}

