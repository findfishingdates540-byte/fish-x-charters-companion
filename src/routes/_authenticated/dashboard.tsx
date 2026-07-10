import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getMyRoles, hasPrimaryRole } from "@/lib/auth.functions";
import { getMyBusinesses } from "@/lib/my-businesses.functions";
import { useEffect } from "react";
import { AnglerDashboard } from "@/components/angler/AnglerDashboard";
import { CaptainDashboard } from "@/components/dashboard/CaptainDashboard";
import { BusinessDashboard, type BusinessType } from "@/components/dashboard";
import { supabase } from "@/integrations/supabase/client";


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

async function handleSignOut() {
  await supabase.auth.signOut();
  window.location.href = "/auth";
}

function AnglerView({ user }: { user: any }) {
  const name = (user.user_metadata?.full_name as string | undefined) ?? user.email;
  return <AnglerDashboard userName={name} userEmail={user.email} />;
}

const businessTypeMap: Record<string, BusinessType> = {
  charter: "captain",
  tackle_shop: "tackle_shop",
  marina: "marina",
  apparel: "apparel",
  gear_mfg: "manufacturer",
  guide_service: "guide_service",
  bait_shop: "tackle_shop",
  lodge: "marina",
};

function OperatorView({ user, businesses }: { user: any; businesses: any[] }) {
  const currentBusiness = businesses[0]?.business;
  const name = (user.user_metadata?.full_name as string | undefined) ?? user.email;
  const businessType: BusinessType = currentBusiness?.category_key
    ? businessTypeMap[currentBusiness.category_key] ?? "captain"
    : "captain";

  if (businessType === "captain") {
    return (
      <CaptainDashboard
        userName={name}
        businessName={currentBusiness?.name}
        onSignOut={handleSignOut}
      />
    );
  }

  return <BusinessDashboard businessType={businessType} onSignOut={handleSignOut} />;
}

