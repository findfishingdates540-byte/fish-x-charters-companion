/**
 * Auth-related server functions.
 * Query user roles and permissions.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (error) throw new Response(error.message, { status: 500 });

    return (data ?? []).map((r: { role: string }) => r.role);
  });

export const hasPrimaryRole = (roles: string[]): "angler" | "business_owner" | "captain" | null => {
  if (roles.includes("captain")) return "captain";
  if (roles.includes("business_owner")) return "business_owner";
  if (roles.includes("angler")) return "angler";
  return null;
};
