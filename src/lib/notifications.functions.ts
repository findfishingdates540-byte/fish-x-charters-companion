/**
 * In-app notification inbox + preferences (angler and operator side).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("notifications")
      .select("id,category,title,body,link,severity,read_at,created_at")
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw new Response(error.message, { status: 500 });
    const items = data ?? [];
    return { items, unread: items.filter((n) => !n.read_at).length };
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ id: z.string().uuid().optional(), all: z.boolean().optional() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .is("read_at", null);
    if (!data.all) {
      if (!data.id) throw new Response("id required", { status: 400 });
      q = q.eq("id", data.id);
    }
    const { error } = await q;
    if (error) throw new Response(error.message, { status: 400 });
    return { ok: true };
  });

export const getNotificationPreferences = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("notification_preferences")
      .select("email_enabled,categories")
      .eq("user_id", context.userId)
      .maybeSingle();
    return {
      emailEnabled: data?.email_enabled ?? true,
      categories: (data?.categories ?? {}) as Record<string, boolean>,
    };
  });

export const updateNotificationPreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        emailEnabled: z.boolean().optional(),
        categories: z.record(z.string(), z.boolean()).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const payload = {
      user_id: context.userId,
      ...(typeof data.emailEnabled === "boolean" ? { email_enabled: data.emailEnabled } : {}),
      ...(data.categories ? { categories: data.categories } : {}),
    };
    const { error } = await context.supabase
      .from("notification_preferences")
      .upsert(payload, { onConflict: "user_id" });

    if (error) throw new Response(error.message, { status: 400 });
    return { ok: true };
  });
