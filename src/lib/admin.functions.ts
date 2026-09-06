/**
 * Platform admin console data + actions: the verification queue, the payout
 * ledger and the dispute tracker.
 *
 * Every function proves the caller holds the `admin` role through their own
 * RLS-scoped client BEFORE the service-role client is loaded.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Admin access only");
}

export const isPlatformAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return { admin: Boolean(data) };
  });

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [verifs, payouts, disputes, businesses] = await Promise.all([
      supabaseAdmin
        .from("verification_requests")
        .select("id,business_id,status,notes,doc_urls,created_at,decided_at")
        .order("created_at", { ascending: false })
        .limit(200),
      supabaseAdmin
        .from("payouts")
        .select("id,business_id,booking_id,amount_cents,currency,status,paid_at,arrival_date,failure_message,created_at")
        .order("created_at", { ascending: false })
        .limit(200),
      supabaseAdmin
        .from("disputes")
        .select("id,booking_id,kind,status,description,resolution_note,created_at,resolved_at")
        .order("created_at", { ascending: false })
        .limit(200),
      supabaseAdmin
        .from("businesses")
        .select("id,name,slug,category_key,city,region,verified_at,charges_enabled,payouts_enabled")
        .limit(1000),
    ]);

    const bizById = new Map(
      (businesses.data ?? []).map((b) => [b.id, b]),
    );
    const named = <T extends { business_id?: string | null }>(rows: T[] | null) =>
      (rows ?? []).map((r) => ({
        ...r,
        business: r.business_id ? bizById.get(r.business_id) ?? null : null,
      }));

    return {
      verifications: named(verifs.data),
      payouts: named(payouts.data),
      disputes: disputes.data ?? [],
      businesses: businesses.data ?? [],
      totals: {
        pendingVerifications: (verifs.data ?? []).filter((v) => v.status === "pending").length,
        openDisputes: (disputes.data ?? []).filter((d) => d.status !== "resolved" && d.status !== "withdrawn").length,
        pendingPayoutCents: (payouts.data ?? [])
          .filter((p) => p.status !== "paid")
          .reduce((s, p) => s + (p.amount_cents ?? 0), 0),
        paidPayoutCents: (payouts.data ?? [])
          .filter((p) => p.status === "paid")
          .reduce((s, p) => s + (p.amount_cents ?? 0), 0),
      },
    };
  });

export const decideVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        requestId: z.string().uuid(),
        approve: z.boolean(),
        note: z.string().max(1000).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: req, error: reqErr } = await supabaseAdmin
      .from("verification_requests")
      .select("id,business_id,status")
      .eq("id", data.requestId)
      .maybeSingle();
    if (reqErr) throw new Error(reqErr.message);
    if (!req) throw new Error("Verification request not found");

    const status = data.approve ? "approved" : "rejected";
    const { error } = await supabaseAdmin
      .from("verification_requests")
      .update({
        status,
        notes: data.note ?? null,
        reviewer_id: context.userId,
        decided_at: new Date().toISOString(),
      })
      .eq("id", data.requestId);
    if (error) throw new Error(error.message);

    // Approving a request is what actually flips the badge on the storefront.
    await supabaseAdmin
      .from("businesses")
      .update({ verified_at: data.approve ? new Date().toISOString() : null })
      .eq("id", req.business_id);

    return { ok: true, status };
  });

export const resolveDispute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        disputeId: z.string().uuid(),
        note: z.string().min(3).max(2000),
        outcome: z.enum(["resolved", "rejected"]),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("disputes")
      .update({
        status: data.outcome,
        resolution_note: data.note,
        resolved_by: context.userId,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", data.disputeId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markPayoutPaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ payoutId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("payouts")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", data.payoutId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
