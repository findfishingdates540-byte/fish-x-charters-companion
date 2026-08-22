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
};

const empty: Draft = { title: "", description: "", priceDollars: 0, unit: "per_trip" };

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
        border: "1px solid rgba(13,34,54,.12)",
        borderRadius: 18,
        padding: 18,
        background: "#fbfcfd",
        marginBottom: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#0d2236" }}>
            Add-ons · {service.title}
          </div>
          <div style={{ fontSize: 12.5, color: "#7b8b99" }}>
            Optional extras anglers can add at checkout.
          </div>
        </div>
        <button style={btn("ghost")} onClick={onClose}>
          Close
        </button>
      </div>

      {isLoading && <div style={{ fontSize: 13, color: "#7b8b99" }}>Loading add-ons…</div>}
      {!isLoading && (rows ?? []).length === 0 && !draft && (
        <div style={{ fontSize: 13, color: "#7b8b99", marginBottom: 12 }}>
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
              background: "#fff",
              border: "1px solid rgba(13,34,54,.10)",
              borderRadius: 13,
              padding: "11px 13px",
            }}
          >
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#0d2236" }}>{a.title}</div>
              {a.description && (
                <div style={{ fontSize: 12.5, color: "#7b8b99" }}>{a.description}</div>
              )}
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: "#0d2236" }}>
              {money(a.price_cents)}{" "}
              <span style={{ fontWeight: 500, color: "#7b8b99" }}>
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
                })
              }
            >
              Edit
            </button>
            <button
              style={{ ...btn("ghost"), color: "#b3261e" }}
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
              <option value="per_trip">Per trip</option>
              <option value="per_person">Per angler</option>
            </select>
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              style={btn()}
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
            <div style={{ gridColumn: "1 / -1", fontSize: 12.5, color: "#b3261e" }}>
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

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: ".08em",
  textTransform: "uppercase",
  color: "#7b8b99",
  marginBottom: 5,
};
