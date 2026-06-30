/**
 * Fish-X Consumer App — API bridge client.
 *
 * Per the Fish-X ecosystem plan, this Charters app communicates with the
 * consumer Fish-X app over signed HTTP calls (HMAC-SHA256) on a documented
 * contract — no shared database, no shared session.
 *
 * This module is the typed front-door used from server functions. The
 * actual signing + secret access happens inside the server runtime; see
 * `fishx-api.server.ts` for the HMAC helper.
 *
 * Endpoints expected on the consumer app (see business plan, §11):
 *  - POST /functions/v1/challenges-create-sponsored
 *  - POST /functions/v1/buddy-request
 *  - GET  /functions/v1/challenge-leaderboard/:id
 *  - GET  /functions/v1/angler-lookup?q=...
 *
 * Configure via env in your Supabase dashboard (server-only):
 *  - FISHX_API_BASE_URL   e.g. https://api.fishx.app
 *  - FISHX_API_HMAC_SECRET
 *  - FISHX_API_ISSUER     e.g. "charters"
 */

export type FishxBuddyRequest = {
  charters_user_id: string;       // Charters captain user id
  angler_email?: string;          // OR angler_user_id
  angler_user_id?: string;
  message?: string;
};

export type FishxSponsoredChallenge = {
  charters_user_id: string;
  title: string;
  species: string;
  starts_at: string;              // ISO
  ends_at: string;                // ISO
  prize_cents: number;
  region?: { lat: number; lng: number; radius_km: number };
};

export type FishxLeaderboardEntry = {
  angler_user_id: string;
  display_name: string;
  best_catch_weight_kg: number | null;
  best_catch_length_cm: number | null;
  rank: number;
};

/**
 * Client-side stub. All real calls go through server functions in
 * `fishx-api.functions.ts` so the HMAC secret never reaches the browser.
 */
export const FISHX_DEEP_LINK = (slug: string) => `fishx://charters/${slug}`;
