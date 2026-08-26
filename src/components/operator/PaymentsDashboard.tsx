/**
 * Money view shared by every operator vertical: revenue, escrow, fees,
 * outstanding on-the-day balances, transactions and the payout ledger.
 */
import { useQuery } from "@tanstack/react-query";
import { getBusinessPayments } from "@/lib/business-payments.functions";

const money = (c: number) =>
  (c / 100).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const money2 = (c: number) =>
  (c / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

const card: React.CSSProperties = {
  background: "#14202B",
  border: "1px solid rgba(255,255,255,.06)",
  borderRadius: 16,
  padding: 20,
  boxShadow: "0 12px 30px -26px rgba(10,34,54,.5)",
};

export function PaymentsDashboard({ businessId }: { businessId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["business-payments", businessId],
    queryFn: () => getBusinessPayments({ data: { businessId } }),
  });

  if (isLoading) return <div style={{ ...card, color: "#92A0AB" }}>Loading payments…</div>;
  if (error)
    return (
      <div style={{ ...card, color: "#F87171" }}>
        {error instanceof Error ? error.message : "Couldn't load payments."}
      </div>
    );
  if (!data) return null;

  const t = data.totals;
  const biz: any = data.business;
  const peak = Math.max(1, ...data.monthly.map((m) => m.cents));

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
          gap: 14,
        }}
      >
        <Kpi label="Gross booked" value={money(t.grossCents)} sub="Trips + product orders" />
        <Kpi label="In escrow" value={money(t.escrowCents)} sub="Releases 72h after completion" />
        <Kpi label="Paid out" value={money(t.releasedCents)} sub="Transferred to your bank" />
        <Kpi
          label="Balance to collect"
          value={money(t.balanceOutstandingCents)}
          sub="Owed to you on the day"
        />
        <Kpi label="Platform fees" value={money(t.feesCents)} sub="Commission taken" />
        <Kpi label="Refunded" value={money(t.refundedCents)} sub="Returned to anglers" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 18 }} className="fx-stack">
        <div style={card}>
          <Head eyebrow="Last 6 months" title="Gross revenue" />
          <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 150, marginTop: 16 }}>
            {data.monthly.map((m) => (
              <div key={m.ym} style={{ flex: 1, display: "grid", gap: 8, justifyItems: "center" }}>
                <span style={{ fontSize: 11, color: "#92A0AB" }}>{money(m.cents)}</span>
                <div
                  style={{
                    width: "100%",
                    height: `${Math.max(4, Math.round((m.cents / peak) * 110))}px`,
                    borderRadius: "8px 8px 0 0",
                    background: "linear-gradient(180deg,#12456b,#1C2936)",
                  }}
                />
                <span style={{ fontSize: 11.5, color: "#A9B6C1", fontWeight: 600 }}>{m.ym}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={card}>
          <Head eyebrow="Your terms" title="Fees & schedule" />
          <Row k="Charter commission" v={`${Math.round((biz.commission_rate ?? 0.15) * 100)}%`} />
          <Row
            k="Product commission"
            v={`${Math.round((biz.product_commission_rate ?? 0.08) * 100)}%`}
          />
          <Row k="Deposit at booking" v={`${Math.round((biz.deposit_rate ?? 0.25) * 100)}%`} />
          <Row k="Payout delay" v={`${biz.payout_delay_days ?? 3} days after the trip`} />
          <Row k="Card payments" v={biz.charges_enabled ? "Enabled" : "Not enabled yet"} />
          <Row k="Bank payouts" v={biz.payouts_enabled ? "Enabled" : "Not enabled yet"} />
        </div>
      </div>

      <div style={card}>
        <Head eyebrow="Ledger" title="Transactions" />
        {data.transactions.length === 0 ? (
          <Empty label="No payments yet — they'll appear here as anglers book." />
        ) : (
          <div style={{ overflowX: "auto", marginTop: 12 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
              <thead>
                <tr>
                  {["Item", "Date", "Status", "Gross", "Fee", "Your net", "Escrow"].map((h) => (
                    <th key={h} style={th}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.transactions.map((x) => (
                  <tr key={`${x.kind}-${x.id}`}>
                    <td style={td}>
                      <strong style={{ color: "#F0F2F5" }}>{x.label}</strong>
                      {x.balanceDueCents > 0 && (
                        <div style={{ fontSize: 12, color: "#b07a1e" }}>
                          {money2(x.balanceDueCents)} balance due on the day
                        </div>
                      )}
                    </td>
                    <td style={td}>{String(x.date).slice(0, 10)}</td>
                    <td style={td}>{x.status.replace(/_/g, " ")}</td>
                    <td style={td}>{money2(x.grossCents)}</td>
                    <td style={td}>−{money2(x.feeCents)}</td>
                    <td style={{ ...td, fontWeight: 700, color: "#F0F2F5" }}>{money2(x.netCents)}</td>
                    <td style={td}>{x.releasedAt ? "released" : x.escrowState}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={card}>
        <Head eyebrow="Bank transfers" title="Payout history" />
        {data.payouts.length === 0 ? (
          <Empty label="No payouts yet. Funds release 72 hours after each completed trip." />
        ) : (
          <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
            {data.payouts.map((p: any) => (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "12px 14px",
                  borderRadius: 12,
                  background: "#1C2936",
                }}
              >
                <div>
                  <strong style={{ color: "#F0F2F5" }}>{money2(p.amount_cents ?? 0)}</strong>
                  <div style={{ fontSize: 12.5, color: "#92A0AB" }}>
                    {p.paid_at
                      ? `Paid ${String(p.paid_at).slice(0, 10)}`
                      : p.arrival_date
                        ? `Arriving ${p.arrival_date}`
                        : `Created ${String(p.created_at).slice(0, 10)}`}
                    {p.failure_message ? ` · ${p.failure_message}` : ""}
                  </div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#A9B6C1", alignSelf: "center" }}>
                  {String(p.status).toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  fontSize: 11,
  letterSpacing: ".08em",
  textTransform: "uppercase",
  color: "#92A0AB",
  padding: "8px 10px",
  borderBottom: "1px solid rgba(255,255,255,.06)",
  whiteSpace: "nowrap",
};
const td: React.CSSProperties = {
  padding: "12px 10px",
  borderBottom: "1px solid rgba(13,34,54,.05)",
  color: "#A9B6C1",
  whiteSpace: "nowrap",
};

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={card}>
      <div style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "#92A0AB", fontWeight: 700 }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: "#F0F2F5", marginTop: 6 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#92A0AB", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function Head({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "#92A0AB", fontWeight: 700 }}>
        {eyebrow}
      </div>
      <h3 style={{ margin: "4px 0 0", fontSize: 19, color: "#F0F2F5" }}>{title}</h3>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        padding: "10px 0",
        borderBottom: "1px solid rgba(13,34,54,.05)",
        fontSize: 13.5,
        color: "#A9B6C1",
      }}
    >
      <span>{k}</span>
      <strong style={{ color: "#F0F2F5" }}>{v}</strong>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <div style={{ padding: "18px 0", color: "#92A0AB", fontSize: 13.5 }}>{label}</div>;
}
