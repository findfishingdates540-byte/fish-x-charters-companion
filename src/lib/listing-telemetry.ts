/**
 * Client-side discovery telemetry. `log_listing_event` is executable by anon,
 * so signed-out browsing still fills the feature vectors the ranker learns from.
 */
import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "fx-session-id";
const seen = new Set<string>();

function sessionId(): string {
  try {
    let id = window.localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      window.localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "anonymous";
  }
}

export async function logListing(
  kind: "impression" | "click" | "book",
  serviceId: string,
  opts: { position?: number; query?: Record<string, string>; features?: Record<string, string | number | boolean> } = {},
) {
  if (typeof window === "undefined") return;
  const dedupe = `${kind}:${serviceId}:${opts.position ?? ""}`;
  if (kind === "impression") {
    if (seen.has(dedupe)) return;
    seen.add(dedupe);
  }
  try {
    await supabase.rpc("log_listing_event", {
      _service_id: serviceId,
      _event_kind: kind,
      _position: opts.position ?? undefined,
      _query: (opts.query ?? {}) as never,
      _features: (opts.features ?? {}) as never,
      _session_id: sessionId(),
    });
  } catch {
    /* telemetry is best-effort */
  }
}

/** Log impressions for a rendered result list (position is 1-based). */
export function logImpressions(serviceIds: string[], query: Record<string, string> = {}) {
  serviceIds.forEach((id, i) => void logListing("impression", id, { position: i + 1, query }));
}
