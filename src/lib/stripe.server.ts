/**
 * Server-only Stripe helpers.
 *
 * Money model (Fish-X Charters marketplace):
 *
 * Charters (deposit model, FishingBooker-style):
 * - Angler pays a 25% DEPOSIT online to the PLATFORM account. The remaining
 *   75% balance is collected by the captain on the day (cash/card/tips).
 * - Platform commission = 15% of the trip total, taken out of that deposit.
 * - The captain's share of the deposit (deposit - commission) transfers 72h
 *   AFTER the booking reaches `completed`, frozen while a dispute is open.
 *
 * Merchandise (physical goods):
 * - Buyer pays 100% up front; funds sit in escrow on the platform balance.
 * - Platform commission = 8%.
 * - Vendor transfer releases 72h after the order is marked delivered.
 *
 * Never import this file from client-reachable module scope. Load it inside
 * server-function / server-route handlers with `await import(...)`.
 */
import Stripe from "stripe";

/** Charter commission, taken out of the 25% deposit. */
export const PLATFORM_FEE_RATE = 0.15;
/** Share of the trip total collected online at booking time. */
export const DEPOSIT_RATE = 0.25;
/** Merchandise commission (thin-margin physical goods). */
export const PRODUCT_FEE_RATE = 0.08;
export const VENDOR_SHARE_RATE = 1 - PLATFORM_FEE_RATE;
/** Hours funds are held after trip completion / delivery before the transfer. */
export const ESCROW_HOLD_HOURS = 72;


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
