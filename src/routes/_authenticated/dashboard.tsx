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
import { GuideDashboard } from "@/components/guide/GuideDashboard";
import {
  getAnglerDashboard,
  listRecommendedCharters,
} from "@/lib/angler-dashboard.functions";
import { getCaptainDashboard } from "@/lib/captain-dashboard.functions";
import { getMarinaOverview } from "@/lib/marina.functions";
import { getShopOverview } from "@/lib/tackle.functions";
import { getGuideOverview } from "@/lib/guide.functions";

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

/**
 * Pick the workspace that matches the signed-in operator.
 * Captains always land on their charter business, never on another
 * vertical (tackle shop, marina…) they happen to be a member of.
 */
function pickPrimaryBusiness(
  businesses: any[],
  primaryRole: string | null,
): any | undefined {
  const owned = businesses.filter((m) => m?.business);
  if (primaryRole === "captain") {
    const charter = owned.find((m) => (m.business.category_key ?? "charter") === "charter");
    if (charter) return charter.business;
  }
  const asOwner = owned.find((m) => m.role === "owner");
  return (asOwner ?? owned[0])?.business;
}


export const Route = createFileRoute("/_authenticated/dashboard")({
  validateSearch: (search: Record<string, unknown>): { tab?: string } =>
    typeof search.tab === "string" ? { tab: search.tab } : {},
  head: () => ({ meta: [{ title: "Dashboard — FISH-X.COM Bookings & Marketplace" }] }),
  loader: async ({ context }) => {
    try {
    const [rolesRaw, businessesRaw] = await Promise.all([
      context.queryClient.ensureQueryData(myRolesQO),
      context.queryClient.ensureQueryData(myBusinessesQO),
      context.queryClient.ensureQueryData(myProfileQO),
    ]);
    const roles = Array.isArray(rolesRaw) ? rolesRaw : [];
    const businesses = Array.isArray(businessesRaw) ? businessesRaw : [];
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
      } else if (key === "guide_service") {
        await context.queryClient.ensureQueryData({
          queryKey: ["guide-overview", biz.id],
          queryFn: () => getGuideOverview({ data: { businessId: biz.id } }),
        });
      }
    }
    } catch (e) {
      // Surface real failure reasons instead of crashing on raw Response
      // objects thrown by server functions (they have no .message).
      if (e instanceof Response) {
        const body = await e.text().catch(() => "");
        throw new Error(
          `Dashboard data failed to load (${e.status})${body ? `: ${body.slice(0, 200)}` : ""}`,
        );
      }
      throw e;
    }
  },
  component: Dashboard,
  errorComponent: ({ error }) => {
    const e = error as unknown;
    const message =
      e instanceof Error
        ? e.message
        : e instanceof Response
          ? `Request failed (${e.status})`
          : "Something went wrong loading your dashboard. Please try again.";
    return (
      <div style={{ padding: 40, fontFamily: "system-ui" }}>
        <h1>Dashboard error</h1>
        <p>{message}</p>
      </div>
    );
  },
});

// (categoryTemplate removed — verticals now use React components below.)

function Dashboard() {
  const { data: rolesRaw } = useSuspenseQuery(myRolesQO);
  const { data: businessesRaw } = useSuspenseQuery(myBusinessesQO);
  const roles = Array.isArray(rolesRaw) ? rolesRaw : [];
  const businesses = Array.isArray(businessesRaw) ? businessesRaw : [];
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
    if (key === "guide_service")
      return (
        <GuideDashboard
          businessId={biz.id}
          workspaceName={biz.name}
          operatorName={operatorName}
        />
      );
    return <DashboardFrame src="/dashboards/captain.html" title="Operator dashboard" />;
  }

  return <DashboardFrame src="/dashboards/angler.html" title="Dashboard" />;
}

