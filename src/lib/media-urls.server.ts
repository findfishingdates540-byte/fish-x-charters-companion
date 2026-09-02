/**
 * Operator media lives in a private Storage bucket, so stored values look like
 * `/api/public/media/<businessId>/public/<file>`. That proxy route is not
 * reachable from every host (editor preview gates it, older published builds
 * lack it), which shows up as broken images. Resolving the paths to signed
 * Supabase URLs on the server makes them load directly, everywhere.
 */
const PREFIX = "/api/public/media/";
const TTL = 60 * 60 * 6;

const cache = new Map<string, { url: string; exp: number }>();

export async function signMediaUrls(values: (string | null | undefined)[]): Promise<(string | null)[]> {
  const paths = values
    .map((v) => (typeof v === "string" && v.startsWith(PREFIX) ? v.slice(PREFIX.length) : null))
    .filter((p): p is string => !!p);

  const now = Date.now();
  const need = [...new Set(paths)].filter((p) => (cache.get(p)?.exp ?? 0) < now);

  if (need.length) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.storage.from("business-media").createSignedUrls(need, TTL);
    for (const row of data ?? []) {
      if (row.signedUrl && row.path) cache.set(row.path, { url: row.signedUrl, exp: now + (TTL - 600) * 1000 });
    }
  }

  return values.map((v) => {
    if (typeof v !== "string" || !v) return null;
    if (!v.startsWith(PREFIX)) return v;
    return cache.get(v.slice(PREFIX.length))?.url ?? v;
  });
}

/** Convenience for a row with a cover image plus a gallery array. */
export async function signRowMedia<T extends { hero_image_url?: string | null; image_urls?: string[] | null }>(
  rows: T[],
): Promise<T[]> {
  const flat: (string | null | undefined)[] = [];
  for (const r of rows) {
    flat.push(r.hero_image_url ?? null, ...((r.image_urls ?? []) as string[]));
  }
  const signed = await signMediaUrls(flat);
  let i = 0;
  return rows.map((r) => {
    const hero = signed[i++] ?? null;
    const gallery = ((r.image_urls ?? []) as string[]).map(() => signed[i++] ?? "").filter(Boolean);
    return { ...r, hero_image_url: hero, image_urls: gallery };
  });
}
