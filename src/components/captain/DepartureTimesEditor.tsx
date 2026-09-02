/**
 * DepartureTimesEditor — captain-facing recurring weekly departure scheduler.
 *
 * Each row = one departure pattern:
 *   - label (e.g. "Morning", "Sunset")
 *   - start_time (local wall-clock, "07:00")
 *   - days_of_week: 0=Sun … 6=Sat toggles
 *   - is_active: whether this pattern is published
 *
 * The component is purely local-state driven: parent owns the array, we emit
 * changes via `onChange`. The parent persists via upsertDepartureTimes when the
 * charter is saved.
 */
import { useState } from "react";

export type DepartureRow = {
  id?: string;
  label: string;
  start_time: string; // "07:00"
  days_of_week: number[]; // 0=Sun..6=Sat
  is_active: boolean;
  sort_order: number;
};

const DAYS = [
  { code: 0, short: "Su" },
  { code: 1, short: "Mo" },
  { code: 2, short: "Tu" },
  { code: 3, short: "We" },
  { code: 4, short: "Th" },
  { code: 5, short: "Fr" },
  { code: 6, short: "Sa" },
];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,.10)",
  background: "#14202B",
  fontSize: 13.5,
  color: "#F0F2F5",
  fontFamily: "inherit",
  outline: "none",
};

const ghostBtn: React.CSSProperties = {
  background: "transparent",
  color: "#92A0AB",
  border: "1px solid rgba(255,255,255,.12)",
  borderRadius: 10,
  padding: "7px 13px",
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
};

const primaryBtn: React.CSSProperties = {
  background: "#2DE2F2",
  color: "#0D161F",
  border: 0,
  borderRadius: 10,
  padding: "8px 15px",
  fontSize: 12.5,
  fontWeight: 700,
  cursor: "pointer",
};

export function DepartureTimesEditor({
  rows,
  onChange,
  disabled,
}: {
  rows: DepartureRow[];
  onChange: (rows: DepartureRow[]) => void;
  disabled?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const update = (idx: number, patch: Partial<DepartureRow>) => {
    const next = rows.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    onChange(next);
  };

  const toggleDay = (idx: number, code: number) => {
    const r = rows[idx];
    const has = r.days_of_week.includes(code);
    const next = has
      ? r.days_of_week.filter((d) => d !== code)
      : [...r.days_of_week, code].sort((a, b) => a - b);
    update(idx, { days_of_week: next });
  };

  const addRow = () => {
    onChange([
      ...rows,
      {
        label: "",
        start_time: "07:00",
        days_of_week: [1, 2, 3, 4, 5], // Mon–Fri default
        is_active: true,
        sort_order: rows.length,
      },
    ]);
  };

  const removeRow = (idx: number) => {
    onChange(rows.filter((_, i) => i !== idx));
  };

  const daySummary = (r: DepartureRow) =>
    r.days_of_week.map((d) => DAY_LABELS[d]).join(" ");

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          style={{ background: "transparent", border: 0, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#2DE2F2", padding: 0 }}
        >
          {collapsed ? "▸ Departure times" : "▾ Departure times"}
        </button>
        {!collapsed && !disabled && (
          <button type="button" onClick={addRow} style={primaryBtn}>
            + Add time
          </button>
        )}
      </div>

      {!collapsed && rows.length === 0 && (
        <div style={{ fontSize: 12.5, color: "#92A0AB", padding: "8px 0" }}>
          No departure times yet. Add weekly recurring times so anglers can book.
        </div>
      )}

      {!collapsed &&
        rows.map((r, idx) => (
          <div
            key={r.id ?? `new-${idx}`}
            style={{
              border: "1px solid rgba(255,255,255,.08)",
              borderRadius: 12,
              padding: 12,
              display: "grid",
              gap: 10,
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 10, alignItems: "end" }}>
              <label style={{ display: "grid", gap: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#92A0AB" }}>Label</span>
                <input value={r.label} onChange={(e) => update(idx, { label: e.target.value })} style={inputStyle} placeholder="Morning" disabled={disabled} />
              </label>
              <label style={{ display: "grid", gap: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#92A0AB" }}>Start time</span>
                <input type="time" value={r.start_time} onChange={(e) => update(idx, { start_time: e.target.value })} style={inputStyle} disabled={disabled} />
              </label>
              <button
                type="button"
                onClick={() => removeRow(idx)}
                disabled={disabled}
                style={{ ...ghostBtn, color: "#F87171", border: "1px solid rgba(248,113,113,.25)", padding: "9px 12px", opacity: disabled ? 0.5 : 1 }}
              >
                Remove
              </button>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {DAYS.map((d) => {
                const on = r.days_of_week.includes(d.code);
                return (
                  <button
                    key={d.code}
                    type="button"
                    onClick={() => toggleDay(idx, d.code)}
                    disabled={disabled}
                    style={{
                      background: on ? "rgba(45,226,242,.16)" : "transparent",
                      color: on ? "#F0F2F5" : "#92A0AB",
                      border: `1px solid ${on ? "#2DE2F2" : "rgba(255,255,255,.12)"}`,
                      borderRadius: 8,
                      padding: "6px 11px",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: disabled ? "default" : "pointer",
                    }}
                  >
                    {d.short}
                  </button>
                );
              })}
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: "#92A0AB" }}>
              <input type="checkbox" checked={r.is_active} onChange={(e) => update(idx, { is_active: e.target.checked })} disabled={disabled} />
              Active
            </label>

            {r.label && r.start_time && r.days_of_week.length > 0 && (
              <div style={{ fontSize: 11.5, color: "#92A0AB" }}>
                Preview: <span style={{ color: "#F0F2F5", fontWeight: 600 }}>{r.start_time} · {r.label || "—"} · {daySummary(r)}</span>
              </div>
            )}
          </div>
        ))}
    </div>
  );
}