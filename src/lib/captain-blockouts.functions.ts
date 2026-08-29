/**
 * Captain blockout dates: business-scoped date ranges that make all the
 * captain's charters unavailable on those days. Reopen restores the slots.
 *
 * Pattern matches captain-charters.functions.ts: pickBusinessId, requireSupabaseAuth,
 * zod validation. The actual slot flip is done in a security-definer SQL function
 * apply_blockout_slots (defined in 20260911120000_blockout_dates.sql).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function pickBusinessId(supabase: any, userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("business_members")
    .select("role,business_id")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  const primary = (data ?? []).find((m: any) => m.role === "owner") ?? data?.[0];
  return primary?.business_id ?? null;
}

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const createInput = z
  .object({
    start_date: isoDate,
    end_date: isoDate,
    reason: z.string().max(400).optional().nullable(),
  })
  .refine((d) => d.end_date >= d.start_date, {
    message: "End date must be on or after the start date",
    path: ["end_date"],
  });

export const listBlockouts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const businessId = await pickBusinessId(context.supabase, context.userId);
    if (!businessId) return [];
    const { data, error } = await context.supabase
      .from("business_blockouts")
      .select("id,business_id,service_id,start_date,end_date,reason,is_active,created_at,updated_at")
      .eq("business_id", businessId)
      .order("start_date", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createBlockout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => createInput.parse(i))
  .handler(async ({ data, context }) => {
    const businessId = await pickBusinessId(context.supabase, context.userId);
    if (!businessId) throw new Error("No business found");

    // 1) Insert the blockout intent
    const { data: row, error: insErr } = await context.supabase
      .from("business_blockouts")
      .insert({
        business_id: businessId,
        service_id: null, // null = applies to all published charter services of this business
        start_date: data.start_date,
        end_date: data.end_date,
        reason: data.reason ?? null,
        is_active: true,
      })
      .select()
      .single();
    if (insErr) throw new Error(insErr.message);

    // 2) Flip the slots. SECURITY DEFINER function — the captain can't
    //    manipulate slots for other businesses.
    const { error: rpcErr } = await context.supabase.rpc("apply_blockout_slots", {
      _business_id: businessId,
      _start_date: data.start_date,
      _end_date: data.end_date,
      _block: true,
    });
    if (rpcErr) throw new Error(rpcErr.message);

    return row;
  });

export const reopenBlockout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const businessId = await pickBusinessId(context.supabase, context.userId);
    if (!businessId) throw new Error("No business found");

    // 1) Load the blockout (RLS also enforces business scoping)
    const { data: block, error: loadErr } = await context.supabase
      .from("business_blockouts")
      .select("id,business_id,service_id,start_date,end_date,is_active")
      .eq("id", data.id)
      .maybeSingle();
    if (loadErr) throw new Error(loadErr.message);
    if (!block) throw new Error("Blockout not found");
    if (block.business_id !== businessId) throw new Error("Not your blockout");

    // 2) Flip the slots back off — idempotent.
    const { error: rpcErr } = await context.supabase.rpc("apply_blockout_slots", {
      _business_id: block.business_id,
      _start_date: block.start_date,
      _end_date: block.end_date,
      _block: false,
    });
    if (rpcErr) throw new Error(rpcErr.message);

    // 3) Deactivate the intent so it doesn't show up in the list.
    const { error: updErr } = await context.supabase
      .from("business_blockouts")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (updErr) throw new Error(updErr.message);

    return { ok: true };
  });
