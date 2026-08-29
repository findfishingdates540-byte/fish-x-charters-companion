/**
 * Operator panel for a listing's optional add-ons. Anglers pick these in the
 * "Add-ons & notes" step of the booking flow and they roll into the total.
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listServiceAddons,
  upsertServiceAddon,
  deleteServiceAddon,
} from "@/lib/service-addons.functions";
import { input, btn } from "@/components/business/BusinessSettings";
import { money } from "@/components/operator/OperatorShell";

type Draft = {
  id?: string;
  title: string;
  description: string;
  priceDollars: number;
  unit: "per_trip" | "per_person";
  maxPerBooking: string;
  capacityPerSlot: string;
  leadTimeHours: string;
};

const empty: Draft = {
  title: "",
  description: "",
  priceDollars: 0,
  unit: "per_trip",
  maxPerBooking: "",
  capacityPerSlot: "",
  leadTimeHours: "0",
};

const numOrNull = (v: string) => (v.trim() === "" ? null : Math.max(0, Math.round(Number(v) || 0)));

export function AddonsManager({
  businessId,
  service,
  onClose,
}: {
  businessId: string;
  service: { id: string; title: string };
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const fetchList = useServerFn(listServiceAddons);
  const upsert = useServerFn(upsertServiceAddon);
  const remove = useServerFn(deleteServiceAddon);
  const key = ["service-addons", service.id];

  const { data: rows, isLoading } = useQuery({
    queryKey: key,
    queryFn: () => fetchList({ data: { serviceId: service.id } }),
  });
  const [draft, setDraft] = useState<Draft | null>(null);
  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const mSave = useMutation({
    mutationFn: (d: Draft) =>
      upsert({
        data: {
          businessId,
          serviceId: service.id,
          id: d.id,
          title: d.title,
          description: d.description || null,
          price_cents: Math.round(d.priceDollars * 100),
          unit: d.unit,
          sort_order: rows?.length ?? 0,
          is_active: true,
          max_per_booking: numOrNull(d.maxPerBooking),
          capacity_per_slot: numOrNull(d.capacityPerSlot),
          lead_time_hours: numOrNull(d.leadTimeHours) ?? 0,
        },
      }),
    onSuccess: () => {
      setDraft(null);
      invalidate();
    },
  });
  const mDelete = useMutation({
    mutationFn: (id: string) => remove({ data: { businessId, id } }),
    onSuccess: invalidate,
  });

  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,.08)",
        borderRadius: 18,
        padding: 18,
        background: "#1C2936",
        marginBottom: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#F0F2F5" }}>
            Add-ons · {service.title}
          </div>
          <div style={{ fontSize: 12.5, color: "#92A0AB" }}>
            Optional extras anglers can add at checkout.
          </div>
        </div>
        <button style={btn("ghost")} onClick={onClose}>
          Close
        </button>
      </div>

      {isLoading && <div style={{ fontSize: 13, color: "#92A0AB" }}>Loading add-ons…</div>}
      {!isLoading && (rows ?? []).length === 0 && !draft && (
        <div style={{ fontSize: 13, color: "#92A0AB", marginBottom: 12 }}>
          No add-ons yet — fish cleaning, extra hour, gear rental, photo package…
        </div>
      )}

      <div style={{ display: "grid", gap: 10 }}>
        {(rows ?? []).map((a) => (
          <div
            key={a.id}
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
              background: "#14202B",
              border: "1px solid rgba(255,255,255,.07)",
              borderRadius: 13,
              padding: "11px 13px",
            }}
          >
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#F0F2F5" }}>{a.title}</div>
              {a.description && (
                <div style={{ fontSize: 12.5, color: "#92A0AB" }}>{a.description}</div>
              )}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 5 }}>
                {a.capacity_per_slot != null && <span style={chip}>{a.capacity_per_slot} per departure</span>}
                {a.max_per_booking != null && <span style={chip}>max {a.max_per_booking} / booking</span>}
                {(a.lead_time_hours ?? 0) > 0 && <span style={chip}>{a.lead_time_hours}h notice</span>}
              </div>
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: "#F0F2F5" }}>
              {money(a.price_cents)}{" "}
              <span style={{ fontWeight: 500, color: "#92A0AB" }}>
                {a.unit === "per_person" ? "/ angler" : "/ trip"}
              </span>
            </div>
            <button
              style={btn("ghost")}
              onClick={() =>
                setDraft({
                  id: a.id,
                  title: a.title,
                  description: a.description ?? "",
                  priceDollars: a.price_cents / 100,
                  unit: a.unit,
                  maxPerBooking: a.max_per_booking == null ? "" : String(a.max_per_booking),
                  capacityPerSlot: a.capacity_per_slot == null ? "" : String(a.capacity_per_slot),
                  leadTimeHours: String(a.lead_time_hours ?? 0),
                })
              }
            >
              Edit
            </button>
            <button
              style={{ ...btn("ghost"), color: "#F87171" }}
              onClick={() => {
                if (confirm(`Remove "${a.title}"?`)) mDelete.mutate(a.id);
              }}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {draft ? (
        <div
          style={{
            marginTop: 14,
            display: "grid",
            gap: 10,
            gridTemplateColumns: "2fr 1fr 1fr",
            alignItems: "end",
          }}
        >
          <label style={{ display: "block", gridColumn: "1 / -1" }}>
            <span style={labelStyle}>Title</span>
            <input
              style={input}
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="Fish cleaning & bagging"
            />
          </label>
          <label style={{ display: "block", gridColumn: "1 / -1" }}>
            <span style={labelStyle}>Description</span>
            <input
              style={input}
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="Mate fillets, bags and ices your catch dockside."
            />
          </label>
          <label style={{ display: "block" }}>
            <span style={labelStyle}>Price (USD)</span>
            <input
              style={input}
              type="number"
              min={0}
              value={draft.priceDollars}
              onChange={(e) => setDraft({ ...draft, priceDollars: Number(e.target.value) })}
            />
          </label>
          <label style={{ display: "block" }}>
            <span style={labelStyle}>Charged</span>
            <select
              style={input}
              value={draft.unit}
              onChange={(e) => setDraft({ ...draft, unit: e.target.value as Draft["unit"] })}
            >
              <option value="per_trip">One cost for all</option>
              <option value="per_person">Per angler</option>
            </select>
          </label>
          <label style={{ display: "block" }}>
            <span style={labelStyle}>Capacity per departure</span>
            <input
              style={input}
              type="number"
              min={0}
              placeholder="Unlimited"
              value={draft.capacityPerSlot}
              onChange={(e) => setDraft({ ...draft, capacityPerSlot: e.target.value })}
            />
          </label>
          <label style={{ display: "block" }}>
            <span style={labelStyle}>Max per booking</span>
            <input
              style={input}
              type="number"
              min={1}
              placeholder="Unlimited"
              value={draft.maxPerBooking}
              onChange={(e) => setDraft({ ...draft, maxPerBooking: e.target.value })}
            />
          </label>
          <label style={{ display: "block" }}>
            <span style={labelStyle}>Notice needed (hours)</span>
            <input
              style={input}
              type="number"
              min={0}
              value={draft.leadTimeHours}
              onChange={(e) => setDraft({ ...draft, leadTimeHours: e.target.value })}
            />
          </label>
          <div style={{ gridColumn: "1 / -1", fontSize: 12, color: "#92A0AB", marginTop: -2 }}>
            Leave capacity and max blank for unlimited. Notice hours block the extra once a
            departure is closer than that.
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              style={btn("primary")}
              disabled={mSave.isPending || draft.title.trim().length < 2}
              onClick={() => mSave.mutate(draft)}
            >
              {mSave.isPending ? "Saving…" : "Save add-on"}
            </button>
            <button style={btn("ghost")} onClick={() => setDraft(null)}>
              Cancel
            </button>
          </div>
          {mSave.error && (
            <div style={{ gridColumn: "1 / -1", fontSize: 12.5, color: "#F87171" }}>
              {String((mSave.error as Error).message)}
            </div>
          )}
        </div>
      ) : (
        <button style={{ ...btn("ghost"), marginTop: 12 }} onClick={() => setDraft({ ...empty })}>
          + Add an add-on
        </button>
      )}
    </div>
  );
}

const chip: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: ".02em",
  color: "#F0F2F5",
  background: "rgba(255,255,255,.05)",
  borderRadius: 999,
  padding: "3px 8px",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: ".08em",
  textTransform: "uppercase",
  color: "#92A0AB",
  marginBottom: 5,
};
