/**
 * Auth-related server functions.
 * Query user roles and permissions.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyRoles = createServerFn({ method: "GET" }).handler(async () => {
  const { supabase, user } = await requireSupabaseAuth();
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  if (error) throw new Response(error.message, { status: 500 });

  return (data ?? []).map(r => r.role);
});

export const hasPrimaryRole = (roles: string[]): "angler" | "business_owner" | "captain" | null => {
  // Priority order: business roles take precedence over angler
  if (roles.includes("captain")) return "captain";
  if (roles.includes("business_owner")) return "business_owner";
  if (roles.includes("angler")) return "angler";
  return null;
};
