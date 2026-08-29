/**
 * BlockoutDatesPanel — captain-facing page to block / reopen date ranges
 * for their entire charter business.
 *
 * A blockout sets `service_availability.is_blackout = true` on every slot of
 * every published bookable_service of the business across the given date
 * range — skipping slots with booked seats, so existing trips survive.
 * Reopen flips the flag back off.
 *
 * Matches the dark theme atoms of the other captain panels
 * (--paper/--ink/--tmut/--goldtext/--line/--card).
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listBlockouts,
  createBlockout,
  reopenBlockout,
} from "@/lib/captain-blockouts.functions";

type BlockoutRow = {
  id: string;
  service_id: string | null;
  start_date: string;
  end_date: string;
  reason: string | null;
  is_active: boolean;
  created_at: string;
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 10,
  border: "1px solid var(--line)",
  background: "var(--card)",
  fontSize: 13.5,
  color: "var(--ink)",
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box",
};

const ghostBtn: React.CSSProperties = {
  background: "transparent",
  color: "var(--tmut)",
  border: "1px solid var(--line)",
  borderRadius: 10,
  padding: "7px 13px",
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
};

const primaryBtn: React.CSSProperties = {
  background: "var(--goldtext)",
  color: "var(--navy)",
  border: 0,
  borderRadius: 10,
  padding: "8px 15px",
  fontSize: 12.5,
  fontWeight: 700,
  cursor: "pointer",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: ".08em",
  textTransform: "uppercase",
  color: "var(--tmut)",
  marginBottom: 5,
};

/** "Sat, Aug 29, 2026" — the format from the captain's mock. */
function fmtDate(iso: string): string {
  return new Date(`${iso}T00:00:00.000Z`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "Sat, Aug 29, 2026" or "Sat, Aug 29, 2026 — Thu, Sep 3, 2026". */
function fmtRange(start: string, end: string): string {
  return start === end ? fmtDate(start) : `${fmtDate(start)} — ${fmtDate(end)}`;
}

export function BlockoutDatesPanel() {
  const qc = useQueryClient();

  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [reason, setReason] = useState("");

  const fetchList = useServerFn(listBlockouts);
  const { data: rows, isLoading } = useQuery({
    queryKey: ["captain-blockouts"],
    queryFn: () => fetchList(),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["captain-blockouts"] });
    // Slots changed → charter calendars and dashboard stats are stale.
    qc.invalidateQueries({ queryKey: ["captain-charters"] });
    qc.invalidateQueries({ queryKey: ["captain-dashboard"] });
    qc.invalidateQueries({ queryKey: ["service-slots"] });
  };

  const mCreate = useMutation({
    mutationFn: () =>
      createBlockout({
        data: {
          start_date: from,
          end_date: to,
          reason: reason.trim() || null,
        },
      }),
    onSuccess: () => {
      invalidate();
      setReason("");
    },
  });

  const mReopen = useMutation({
    mutationFn: (id: string) => reopenBlockout({ data: { id } }),
    onSuccess: invalidate,
  });

  const blockouts: BlockoutRow[] = rows ?? [];
  const active = blockouts.filter((b) => b.is_active);
  const reopened = blockouts.filter((b) => !b.is_active);
  const invalid =
    !from || !to || to < from || (mCreate.isPending ?? false);

  return (
    <div style={{ display: "grid", gap: 20, maxWidth: 720 }}>
      {/* BLOCK DATES FORM */}
      <div
        style={{
          border: "1px solid var(--line)",
          borderRadius: 18,
          padding: 20,
          background: "rgba(255,255,255,.02)",
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", marginBottom: 14 }}>
          Block dates
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <label>
            <span style={labelStyle}>From</span>
            <input
              style={inputStyle}
              type="date"
              value={from}
              min={today}
              onChange={(e) => {
                const v = e.target.value;
                setFrom(v);
                if (to < v) setTo(v);
              }}
            />
          </label>
          <label>
            <span style={labelStyle}>To</span>
            <input
              style={inputStyle}
              type="date"
              value={to}
              min={from || today}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
        </div>

        <label style={{ display: "block", marginTop: 14 }}>
          <span style={labelStyle}>Reason (private)</span>
          <input
            style={inputStyle}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Haul-out, family, tournament…"
          />
        </label>

        {mCreate.error && (
          <div style={{ marginTop: 10, fontSize: 12.5, color: "#F87171" }}>
            {String((mCreate.error as Error).message)}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button
            style={primaryBtn}
            disabled={invalid}
            onClick={() => mCreate.mutate()}
          >
            {mCreate.isPending ? "Blocking…" : "Block these dates"}
          </button>
        </div>
      </div>

      {/* BLOCKED RANGES */}
      <div
        style={{
          border: "1px solid var(--line)",
          borderRadius: 18,
          padding: 20,
          background: "rgba(255,255,255,.02)",
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", marginBottom: 14 }}>
          Blocked ranges
        </div>

        {isLoading && (
          <div style={{ color: "var(--tmut)", padding: 16, fontSize: 13 }}>Loading…</div>
        )}
        {!isLoading && active.length === 0 && (
          <div style={{ color: "var(--tmut)", padding: 24, textAlign: "center", fontSize: 13 }}>
            No blocked ranges — all your charters are open for booking.
          </div>
        )}

        {active.map((b) => (
          <div
            key={b.id}
            style={{
              padding: "14px 0",
              borderBottom: "1px solid var(--line)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>
                  {fmtRange(b.start_date, b.end_date)}
                </div>
                {b.reason && (
                  <div style={{ fontSize: 12, color: "var(--tmut)", marginTop: 3 }}>
                    {b.reason}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    borderRadius: 999,
                    padding: "3px 9px",
                    color: "#F87171",
                    background: "rgba(248,113,113,.14)",
                  }}
                >
                  Unavailable
                </span>
                <button
                  style={{ ...ghostBtn, color: "var(--ink)" }}
                  disabled={mReopen.isPending}
                  onClick={() => mReopen.mutate(b.id)}
                >
                  Reopen
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Reopened history (collapsed under the active list) */}
        {reopened.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--tmut)", marginBottom: 8 }}>
              Reopened
            </div>
            {reopened.slice(0, 6).map((b) => (
              <div
                key={b.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "9px 0",
                  fontSize: 12.5,
                  color: "var(--tmut)",
                }}
              >
                <span>{fmtRange(b.start_date, b.end_date)}</span>
                <span style={{ fontSize: 11, color: "var(--green)" }}>Available again</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ fontSize: 12, color: "var(--tmut)", lineHeight: 1.6 }}>
        Blocking a date closes every charter trip you run on those days — departures with
        existing bookings are kept. Reopening restores availability for the whole range.
      </div>
    </div>
  );
}
