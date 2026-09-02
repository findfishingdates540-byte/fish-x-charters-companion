import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MARINA_AMENITIES, submitServiceRequest } from "@/lib/marina.functions";

/** Storefront form: a boater asks the marina for a dock service. */
export function MarinaServiceRequest({
  businessId,
  amenities,
}: {
  businessId: string;
  amenities: Record<string, boolean>;
}) {
  const submit = useServerFn(submitServiceRequest);
  const offered = MARINA_AMENITIES.filter((a) => amenities[a.key]);
  const [form, setForm] = useState({
    serviceKey: (offered[0]?.key ?? "fuel") as string,
    vesselName: "",
    contactName: "",
    contactEmail: "",
    requestedDate: "",
    note: "",
  });

  const m = useMutation({ mutationFn: submit });

  if (m.isSuccess) {
    return (
      <section style={CARD}>
        <h2 style={title}>Request sent</h2>
        <p style={{ color: "#92A0AB", margin: 0 }}>
          The dock team will get back to you at {form.contactEmail || "your contact"}.
        </p>
      </section>
    );
  }

  return (
    <section style={CARD}>
      <h2 style={title}>Request a dock service</h2>
      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))" }}>
        <select
          style={input}
          value={form.serviceKey}
          onChange={(e) => setForm({ ...form, serviceKey: e.target.value })}
        >
          {(offered.length ? offered : MARINA_AMENITIES).map((a) => (
            <option key={a.key} value={a.key}>
              {a.label}
            </option>
          ))}
        </select>
        <input
          style={input}
          placeholder="Vessel name"
          value={form.vesselName}
          onChange={(e) => setForm({ ...form, vesselName: e.target.value })}
        />
        <input
          style={input}
          placeholder="Your name"
          value={form.contactName}
          onChange={(e) => setForm({ ...form, contactName: e.target.value })}
        />
        <input
          style={input}
          type="email"
          placeholder="Email"
          value={form.contactEmail}
          onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
        />
        <input
          style={input}
          type="date"
          value={form.requestedDate}
          onChange={(e) => setForm({ ...form, requestedDate: e.target.value })}
        />
      </div>
      <textarea
        style={{ ...input, marginTop: 10, minHeight: 84, width: "100%" }}
        placeholder="Anything the dock team should know"
        maxLength={1000}
        value={form.note}
        onChange={(e) => setForm({ ...form, note: e.target.value })}
      />
      {m.isError && (
        <div style={{ color: "#F87171", fontSize: 13, marginTop: 8 }}>
          {(m.error as Error).message}
        </div>
      )}
      <button
        style={btn}
        disabled={m.isPending || !form.contactEmail}
        onClick={() =>
          m.mutate({
            data: {
              businessId,
              serviceKey: form.serviceKey,
              vesselName: form.vesselName || undefined,
              contactName: form.contactName || undefined,
              contactEmail: form.contactEmail || undefined,
              requestedDate: form.requestedDate || undefined,
              note: form.note || undefined,
            },
          })
        }
      >
        {m.isPending ? "Sending…" : "Send request"}
      </button>
    </section>
  );
}

const CARD: React.CSSProperties = {
  background: "#14202B",
  border: "1px solid rgba(255,255,255,.07)",
  borderRadius: 20,
  padding: 26,
};

const title: React.CSSProperties = {
  fontFamily: "'Cormorant Garamond', Georgia, serif",
  fontSize: 26,
  fontWeight: 600,
  margin: "0 0 14px",
  color: "#F0F2F5",
};

const input: React.CSSProperties = {
  background: "#0D161F",
  border: "1px solid rgba(255,255,255,.09)",
  borderRadius: 10,
  padding: "10px 12px",
  color: "#F0F2F5",
  fontSize: 14,
  fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
  outline: "none",
  boxSizing: "border-box",
};

const btn: React.CSSProperties = {
  marginTop: 12,
  background: "#2DE2F2",
  color: "#031029",
  border: 0,
  borderRadius: 11,
  padding: "11px 18px",
  fontSize: 13.5,
  fontWeight: 800,
  cursor: "pointer",
  fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
};
