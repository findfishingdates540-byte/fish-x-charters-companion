/**
 * Server-only Stripe helpers.
 *
 * Money model (Fish-X Charters marketplace):
 * - Angler pays the full trip total to the PLATFORM account (separate charges
 *   and transfers), so funds sit in escrow on the platform balance.
 * - Vendor share  = 80% of the trip price.
 * - Platform take = 20%.
 * - The vendor transfer is only created 24h AFTER the booking reaches
 *   `completed`, and is frozen while an open dispute exists.
 *
 * Never import this file from client-reachable module scope. Load it inside
 * server-function / server-route handlers with `await import(...)`.
 */
import Stripe from "stripe";

export const PLATFORM_FEE_RATE = 0.2;
export const VENDOR_SHARE_RATE = 1 - PLATFORM_FEE_RATE;
/** Hours funds are held after trip completion before the vendor transfer. */
export const ESCROW_HOLD_HOURS = 24;

let _stripe: Stripe | null = null;

/** Returns null when STRIPE_SECRET_KEY is not configured yet. */
export function getStripe(): Stripe | null {
  const key = process.env["STRIPE_SECRET_KEY"];
  if (!key) return null;
  if (!_stripe) {
    _stripe = new Stripe(key, { apiVersion: "2025-10-29.clover" as Stripe.LatestApiVersion });
  }
  return _stripe;
}

export function requireStripe(): Stripe {
  const stripe = getStripe();
  if (!stripe) {
    throw new Response(
      "Stripe is not configured yet. Add STRIPE_SECRET_KEY to enable live payments.",
      { status: 503 },
    );
  }
  return stripe;
}

/** Splits a gross trip amount into vendor / platform shares (cents). */
export function splitAmount(totalCents: number) {
  const platformFeeCents = Math.round(totalCents * PLATFORM_FEE_RATE);
  return { platformFeeCents, vendorCents: totalCents - platformFeeCents };
}
