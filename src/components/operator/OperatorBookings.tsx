/**
 * Booking workflow board for non-charter verticals (marina slips, lodging,
 * guided trips) — request inbox + upcoming/past bookings with escrow state,
 * matching what charter captains already get.
 */
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listOperatorBookings } from "@/lib/booking-requests.functions";
import { Card, StatusPill, money } from "@/components/operator/OperatorShell";
import { RequestInbox } from "@/components/operator/RequestInbox";

const MUT = "#92A0AB";
const LINE = "rgba(255,255,255,.10)";

const SCOPES = [
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
  { key: "all", label: "All" },
] as const;

function toneFor(status: string): "green" | "gold" | "cyan" | "red" | "muted" {
  if (status === "confirmed" || status === "in_progress") return "green";
  if (status === "pending_confirmation" || status === "pending_payment") return "gold";
  if (status === "completed" || status === "reviewed") return "cyan";
  if (status.startsWith("cancelled") || status === "declined" || status === "disputed")
    return "red";
  return "muted";
}

export function OperatorBookings({
  businessId,
  requestsEmptyText,
}: {
  businessId: string;
  requestsEmptyText?: string;
}) {
  const [scope, setScope] = useState<(typeof SCOPES)[number]["key"]>("upcoming");
  const fn = useServerFn(listOperatorBookings);
  const q = useQuery({
    queryKey: ["operator-bookings", businessId, scope],
    queryFn: () => fn({ data: { businessId, scope } }),
  });
  const rows = (q.data ?? []) as any[];

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <Card eyebrow="Requests" title="Waiting on your decision">
        <RequestInbox businessId={businessId} emptyText={requestsEmptyText} />
      </Card>

      <Card
        eyebrow="Bookings"
        title="Guest bookings"
        right={
          <div style={{ display: "flex", gap: 6 }}>
            {SCOPES.map((s) => (
              <button
                key={s.key}
                onClick={() => setScope(s.key)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 20,
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  border: `1px solid ${LINE}`,
                  background: scope === s.key ? "#1C2936" : "transparent",
                  color: scope === s.key ? "#F0F2F5" : MUT,
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        }
      >
        {q.isLoading && <div style={{ fontSize: 13, color: MUT }}>Loading…</div>}
        {!q.isLoading && rows.length === 0 && (
          <div style={{ fontSize: 13.5, color: MUT }}>
            No bookings in this view yet.
          </div>
        )}
        {rows.map((b, i) => (
          <Link
            key={b.id}
            to="/bookings/detail"
            search={{ id: b.id }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "13px 0",
              borderBottom: i < rows.length - 1 ? `1px solid ${LINE}` : "none",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                {b.service?.title ?? "Booking"}
              </div>
              <div style={{ fontSize: 12.5, color: MUT }}>
                {new Date(b.trip_date).toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
                {b.party_size ? ` · ${b.party_size} guests` : ""}
                {(() => {
                  // balance_due_cents drops to 0 once collected — fall back to
                  // total minus deposit so the figure stays visible.
                  const bal =
                    b.balance_due_cents ||
                    Math.max(0, (b.total_cents ?? 0) - (b.deposit_cents ?? 0));
                  if (!bal) return "";
                  return ` · ${money(bal)} ${b.balance_collected_at ? "balance collected" : "due on arrival"}`;
                })()}
              </div>
            </div>
            <StatusPill label={String(b.status).replace(/_/g, " ")} tone={toneFor(b.status)} />
            <div
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: 17,
                fontWeight: 600,
                color: "#2DE2F2",
                minWidth: 90,
                textAlign: "right",
              }}
            >
              {money(b.total_cents)}
            </div>
          </Link>
        ))}
      </Card>
    </div>
  );
}
