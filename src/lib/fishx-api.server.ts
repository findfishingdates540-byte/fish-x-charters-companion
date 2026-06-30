/**
 * Server-only Fish-X bridge: HMAC-signed fetch against the consumer app.
 *
 * This file MUST NOT be imported from any client-reachable module.
 * The `.server.ts` extension makes the bundler refuse such imports.
 */
import { createHmac, randomBytes } from "node:crypto";

const BASE_URL = process.env.FISHX_API_BASE_URL ?? "";
const HMAC_SECRET = process.env.FISHX_API_HMAC_SECRET ?? "";
const ISSUER = process.env.FISHX_API_ISSUER ?? "charters";

function sign(body: string, ts: string, nonce: string) {
  return createHmac("sha256", HMAC_SECRET)
    .update(`${ISSUER}.${ts}.${nonce}.${body}`)
    .digest("hex");
}

export async function fishxFetch<T>(
  path: string,
  init: { method?: "GET" | "POST"; body?: unknown } = {},
): Promise<T> {
  if (!BASE_URL || !HMAC_SECRET) {
    throw new Error("Fish-X bridge not configured (FISHX_API_BASE_URL / FISHX_API_HMAC_SECRET)");
  }
  const method = init.method ?? (init.body ? "POST" : "GET");
  const body = init.body ? JSON.stringify(init.body) : "";
  const ts = Math.floor(Date.now() / 1000).toString();
  const nonce = randomBytes(12).toString("hex");
  const signature = sign(body, ts, nonce);

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      "x-fishx-issuer": ISSUER,
      "x-fishx-timestamp": ts,
      "x-fishx-nonce": nonce,
      "x-fishx-signature": signature,
    },
    body: body || undefined,
  });

  if (!res.ok) {
    throw new Error(`Fish-X bridge call failed: ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}
