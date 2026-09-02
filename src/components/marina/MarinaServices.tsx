import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  MARINA_AMENITIES,
  getMarinaServices,
  setMarinaAmenities,
  updateServiceRequest,
} from "@/lib/marina.functions";
import { Card, StatusPill } from "@/components/operator/OperatorShell";

const STATUSES = ["new", "scheduled", "done", "declined"] as const;

export function MarinaServices({ businessId }: { businessId: string }) {
  const qc = useQueryClient();
  const load = useServerFn(getMarinaServices);
  const saveAmenities = useServerFn(setMarinaAmenities);
  const updateReq = useServerFn(updateServiceRequest);

  const { data, isLoading } = useQuery({
    queryKey: ["marina-services", businessId],
    queryFn: () => load({ data: { businessId } }),
  });

  const [draft, setDraft] = useState<Record<string, boolean> | null>(null);
  const amenities = draft ?? data?.amenities ?? {};

  const saveM = useMutation({
    mutationFn: saveAmenities,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["marina-services", businessId] }),
  });
  const reqM = useMutation({
    mutationFn: updateReq,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["marina-services", businessId] }),
  });

  const requests = data?.requests ?? [];

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <Card
        eyebrow="Amenities"
        title="What your marina offers"
        right={
          <button
            style={btn}
            disabled={saveM.isPending || !draft}
            onClick={() =>
              draft && saveM.mutate({ data: { businessId, amenities: draft } })
            }
          >
            {saveM.isPending ? "Saving…" : "Save amenities"}
          </button>
        }
      >
        {isLoading ? (
          <div style={muted}>Loading…</div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(190px,1fr))",
              gap: 10,
            }}
          >
            {MARINA_AMENITIES.map((a) => {
              const on = amenities[a.key] === true;
              return (
                <button
                  key={a.key}
                  onClick={() =>
                    setDraft({ ...(amenities as Record<string, boolean>), [a.key]: !on })
                  }
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "12px 14px",
                    borderRadius: 12,
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
                    fontSize: 13.5,
                    fontWeight: 600,
                    background: on ? "rgba(45,226,242,.12)" : "#14202B",
                    border: `1px solid ${on ? "#2DE2F2" : "rgba(255,255,255,.08)"}`,
                    color: on ? "#2DE2F2" : "#92A0AB",
                  }}
                >
                  <span
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 5,
                      border: `1px solid ${on ? "#2DE2F2" : "rgba(255,255,255,.2)"}`,
                      background: on ? "#2DE2F2" : "transparent",
                      display: "inline-block",
                    }}
                  />
                  {a.label}
                </button>
              );
            })}
          </div>
        )}
      </Card>

      <Card eyebrow="Inbox" title="Service requests">
        {requests.length === 0 ? (
          <div style={muted}>No service requests yet.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {requests.map((r: any) => (
              <div
                key={r.id}
                style={{
                  border: "1px solid rgba(255,255,255,.07)",
                  borderRadius: 12,
                  padding: 14,
                  display: "grid",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ color: "#F0F2F5", fontWeight: 700, fontSize: 14 }}>
                      {(MARINA_AMENITIES.find((a) => a.key === r.service_key)?.label) ??
                        r.service_key}
                      {r.vessel_name ? ` · ${r.vessel_name}` : ""}
                    </div>
                    <div style={{ color: "#92A0AB", fontSize: 12.5 }}>
                      {[
                        r.contact_name,
                        r.contact_email,
                        r.contact_phone,
                        r.requested_date
                          ? new Date(r.requested_date).toLocaleDateString()
                          : null,
                        r.slip?.slip_number ? `Slip ${r.slip.slip_number}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </div>
                  </div>
                  <StatusPill
                    label={r.status}
                    tone={
                      (r.status === "done"
                        ? "green"
                        : r.status === "declined"
                          ? "red"
                          : r.status === "scheduled"
                            ? "cyan"
                            : "gold") as any
                    }
                  />
                </div>
                {r.note && (
                  <div style={{ color: "#92A0AB", fontSize: 13, lineHeight: 1.5 }}>{r.note}</div>
                )}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {STATUSES.filter((s) => s !== r.status).map((s) => (
                    <button
                      key={s}
                      style={btnGhost}
                      disabled={reqM.isPending}
                      onClick={() =>
                        reqM.mutate({ data: { businessId, id: r.id, status: s } })
                      }
                    >
                      Mark {s}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

const muted: React.CSSProperties = { color: "#92A0AB", fontSize: 14 };

const btn: React.CSSProperties = {
  background: "#0D161F",
  color: "#F0F2F5",
  border: 0,
  borderRadius: 11,
  padding: "10px 16px",
  fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

const btnGhost: React.CSSProperties = {
  background: "transparent",
  color: "#F0F2F5",
  border: "1px solid rgba(255,255,255,.09)",
  borderRadius: 10,
  padding: "7px 12px",
  fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
  textTransform: "capitalize",
};
