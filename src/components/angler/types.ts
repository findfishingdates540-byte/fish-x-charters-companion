/**
 * Angler component shared types
 */

export type ViewType = "home" | "trips" | "explore" | "wallet" | "orders";
export type TripsTab = "upcoming" | "past";
export type BookingStep = "results" | "detail" | "checkout" | "confirmed";
export type PkgId = "half" | "full" | "overnight";

export interface CharterCard {
  id: string;
  img: string;
  rating: string;
  place: string;
  title: string;
  price: string;
  tag?: string;
  captain?: string;
  reviews?: string;
}

export interface TripRow {
  img: string;
  title: string;
  meta: string;
  price: string;
  status: string;
  statusColor: string;
  statusBg: string;
  action: string;
}

export interface Transaction {
  icon: string;
  iconBg: string;
  iconColor: string;
  label: string;
  date: string;
  amount: string;
  amtColor: string;
}

export interface Order {
  id: string;
  date: string;
  seller: string;
  type: string;
  items: string;
  total: string;
  status: "delivered" | "transit" | "done";
  eta?: string;
  doneNote?: string;
}

export interface EscrowStep {
  title: string;
  desc: string;
  state: "done" | "current" | "todo" | "skip";
}

export interface Message {
  me: boolean;
  text: string;
}
