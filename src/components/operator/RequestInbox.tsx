/**
 * Request-to-book inbox with a live countdown to the accept deadline.
 * Used by charter, guide, marina and lodging operators — accepting captures
 * the authorised deposit, declining cancels/refunds it.
 */
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listPendingRequests,
  respondToBookingRequest,
} from "@/lib/booking-requests.functions";

const INK = "#F0F2F5";
const MUT = "#92A0AB";
const LINE = "rgba(255,255,255,.10)";

function money(cents?: number | null) {
  return ((cents ?? 0) / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function useTick(ms = 1000) {
  const [, set] = useState(0);
  useEffect(() => {
    const id = setInterval(() => set((n) => n + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
}

function remaining(deadline?: string | null) {
  if (!deadline) return null;
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return { expired: true, label: "Deadline passed", urgent: true };
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  return {
    expired: false,
    urgent: diff < 3 * 3_600_000,
    label: h > 0 ? `${h}h ${m}m left` : `${m}m ${String(s).padStart(2, "0")}s left`,
  };
}

export function RequestInbox({
  businessId,
  emptyText = "No requests waiting on you right now.",
}: {
  businessId?: string;
  emptyText?: string;
}) {
  useTick();
  const qc = useQueryClient();
  const listFn = useServerFn(listPendingRequests);
  const respondFn = useServerFn(respondToBookingRequest);
  const [err, setErr] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["pending-requests", businessId ?? "me"],
    queryFn: () => listFn({ data: businessId ? { businessId } : {} }),
    refetchInterval: 60_000,
  });

  const respond = useMutation({
    mutationFn: (v: { bookingId: string; action: "accept" | "decline" }) =>
      respondFn({ data: v }),
    onMutate: (v) => {
      setErr(null);
      setActiveId(v.bookingId);
    },
    onSettled: () => setActiveId(null),
    onError: async (e: unknown) => {
      setErr(
        e instanceof Response
          ? (await e.text()).slice(0, 200)
          : e instanceof Error
            ? e.message
            : "Something went wrong.",
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pending-requests"] });
      qc.invalidateQueries({ queryKey: ["operator-bookings"] });
      qc.invalidateQueries({ queryKey: ["captain-dashboard"] });
      qc.invalidateQueries({ queryKey: ["marina-overview"] });
      qc.invalidateQueries({ queryKey: ["guide-overview"] });
    },
  });

  const rows = (q.data ?? []) as any[];

  if (q.isLoading)
    return <div style={{ fontSize: 13, color: MUT }}>Loading requests…</div>;

  if (!rows.length)
    return <div style={{ fontSize: 13.5, color: MUT }}>{emptyText}</div>;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {err && <div style={{ fontSize: 12.5, color: "#F87171" }}>{err}</div>}
      {rows.map((b) => {
        const t = remaining(b.accept_deadline_at);
        const busy = respond.isPending && activeId === b.id;
        return (
          <div
            key={b.id}
            style={{
              border: `1px solid ${t?.urgent ? "rgba(216,81,74,.35)" : LINE}`,
              borderRadius: 14,
              padding: 16,
              display: "grid",
              gap: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 600, color: INK }}>
                  {b.service?.title ?? "Booking request"}
                </div>
                <div style={{ fontSize: 12.5, color: MUT, marginTop: 2 }}>
                  {new Date(b.trip_date).toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                  {b.start_time ? ` · ${String(b.start_time).slice(0, 5)}` : ""}
                  {b.party_size ? ` · ${b.party_size} guests` : ""}
                </div>
                {b.notes && (
                  <div style={{ fontSize: 12.5, color: MUT, marginTop: 6, fontStyle: "italic" }}>
                    “{b.notes}”
                  </div>
                )}
              </div>

              <div style={{ textAlign: "right", flex: "none" }}>
                <div
                  style={{
                    fontFamily: "'Cormorant Garamond', Georgia, serif",
                    fontSize: 20,
                    fontWeight: 600,
                    color: "#F2B93D",
                  }}
                >
                  {money(b.deposit_cents || b.total_cents)}
                </div>
                <div style={{ fontSize: 11.5, color: MUT }}>
                  deposit held · {money(b.balance_due_cents)} on the day
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  borderRadius: 20,
                  padding: "5px 12px",
                  background: t?.urgent ? "rgba(216,81,74,.16)" : "rgba(242,185,61,.15)",
                  color: t?.urgent ? "#F87171" : "#F2B93D",
                }}
              >
                {t?.label ?? "Awaiting your response"}
              </span>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => respond.mutate({ bookingId: b.id, action: "decline" })}
                  disabled={busy}
                  style={{
                    border: `1px solid ${LINE}`,
                    background: "transparent",
                    color: MUT,
                    borderRadius: 10,
                    padding: "9px 16px",
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: busy ? "default" : "pointer",
                  }}
                >
                  Decline
                </button>
                <button
                  onClick={() => respond.mutate({ bookingId: b.id, action: "accept" })}
                  disabled={busy}
                  style={{
                    border: 0,
                    background: INK,
                    color: "#F0F2F5",
                    borderRadius: 10,
                    padding: "9px 18px",
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: busy ? "default" : "pointer",
                    opacity: busy ? 0.7 : 1,
                  }}
                >
                  {busy ? "Working…" : "Accept & capture deposit"}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
