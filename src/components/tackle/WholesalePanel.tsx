import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getTradeCatalog,
  saveWholesaleSettings,
  saveVariants,
  decideTradeAccount,
} from "@/lib/wholesale.functions";
import { Card, StatusPill, money } from "@/components/operator/OperatorShell";

type Product = { id: string; title: string; price_cents: number; sku: string | null };

type VariantDraft = {
  id?: string;
  optionName: string;
  optionValue: string;
  sku: string;
  priceDeltaCents: number;
  stockQty: number;
};

export function WholesalePanel({
  businessId,
  products,
}: {
  businessId: string;
  products: Product[];
}) {
  const qc = useQueryClient();
  const load = useServerFn(getTradeCatalog);
  const saveSettings = useServerFn(saveWholesaleSettings);
  const saveVars = useServerFn(saveVariants);

  const { data } = useQuery({
    queryKey: ["trade-catalog", businessId],
    queryFn: () => load({ data: { businessId } }),
  });

  const [productId, setProductId] = useState<string | null>(products[0]?.id ?? null);
  const product = products.find((p) => p.id === productId) ?? null;

  const saved = useMemo(() => {
    const s = (data?.settings ?? []).find((r: any) => r.product_id === productId);
    const tiers = (data?.tiers ?? []).filter((r: any) => r.product_id === productId);
    const variants = (data?.variants ?? []).filter((r: any) => r.product_id === productId);
    return { s, tiers, variants };
  }, [data, productId]);

  const [form, setForm] = useState<null | {
    minOrderQty: number;
    casePack: number;
    wholesaleOnly: boolean;
    wholesalePriceCents: number;
    tiers: { minQty: number; unitPriceCents: number }[];
  }>(null);
  const [variantDraft, setVariantDraft] = useState<VariantDraft[] | null>(null);
  const [dirtyFor, setDirtyFor] = useState<string | null>(null);

  // Reset drafts when switching products.
  if (dirtyFor !== productId) {
    setDirtyFor(productId);
    setForm(null);
    setVariantDraft(null);
  }

  const current =
    form ?? {
      minOrderQty: saved.s?.min_order_qty ?? 1,
      casePack: saved.s?.case_pack ?? 1,
      wholesaleOnly: saved.s?.wholesale_only ?? false,
      wholesalePriceCents: saved.s?.wholesale_price_cents ?? 0,
      tiers: (saved.tiers as any[]).map((t) => ({
        minQty: t.min_qty,
        unitPriceCents: t.unit_price_cents,
      })),
    };

  const variants: VariantDraft[] =
    variantDraft ??
    (saved.variants as any[]).map((v) => ({
      id: v.id,
      optionName: v.option_name,
      optionValue: v.option_value,
      sku: v.sku ?? "",
      priceDeltaCents: v.price_delta_cents,
      stockQty: v.stock_qty,
    }));

  const settingsM = useMutation({
    mutationFn: saveSettings,
    onSuccess: () => {
      setForm(null);
      qc.invalidateQueries({ queryKey: ["trade-catalog", businessId] });
    },
  });
  const variantsM = useMutation({
    mutationFn: saveVars,
    onSuccess: () => {
      setVariantDraft(null);
      qc.invalidateQueries({ queryKey: ["trade-catalog", businessId] });
      qc.invalidateQueries({ queryKey: ["shop-overview", businessId] });
    },
  });

  if (!products.length) {
    return (
      <Card eyebrow="Wholesale" title="Trade pricing">
        <div style={muted}>Add a product first, then set trade terms here.</div>
      </Card>
    );
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <Card eyebrow="Wholesale" title="Trade pricing & variants">
        <label style={{ display: "grid", gap: 6, maxWidth: 380 }}>
          <span style={lbl}>Product</span>
          <select
            style={input}
            value={productId ?? ""}
            onChange={(e) => setProductId(e.target.value)}
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </label>

        {product && (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
                gap: 12,
                marginTop: 16,
              }}
            >
              <label style={{ display: "grid", gap: 6 }}>
                <span style={lbl}>Minimum order qty</span>
                <input
                  style={input}
                  type="number"
                  min={1}
                  value={current.minOrderQty}
                  onChange={(e) =>
                    setForm({ ...current, minOrderQty: Math.max(1, +e.target.value || 1) })
                  }
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={lbl}>Case pack</span>
                <input
                  style={input}
                  type="number"
                  min={1}
                  value={current.casePack}
                  onChange={(e) =>
                    setForm({ ...current, casePack: Math.max(1, +e.target.value || 1) })
                  }
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={lbl}>Wholesale unit price ($)</span>
                <input
                  style={input}
                  type="number"
                  min={0}
                  step="0.01"
                  value={(current.wholesalePriceCents / 100).toString()}
                  onChange={(e) =>
                    setForm({
                      ...current,
                      wholesalePriceCents: Math.round((+e.target.value || 0) * 100),
                    })
                  }
                />
              </label>
              <label style={{ display: "flex", gap: 9, alignItems: "center", marginTop: 22 }}>
                <input
                  type="checkbox"
                  checked={current.wholesaleOnly}
                  onChange={(e) => setForm({ ...current, wholesaleOnly: e.target.checked })}
                />
                <span style={{ color: "#F0F2F5", fontSize: 13.5 }}>
                  Wholesale only (hide from retail buyers)
                </span>
              </label>
            </div>

            <div style={{ marginTop: 18 }}>
              <div style={lbl}>Price breaks</div>
              <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                {current.tiers.map((t, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      style={{ ...input, width: 120 }}
                      type="number"
                      min={1}
                      value={t.minQty}
                      onChange={(e) => {
                        const tiers = [...current.tiers];
                        tiers[i] = { ...t, minQty: Math.max(1, +e.target.value || 1) };
                        setForm({ ...current, tiers });
                      }}
                    />
                    <span style={{ color: "#92A0AB", fontSize: 13 }}>units or more →</span>
                    <input
                      style={{ ...input, width: 140 }}
                      type="number"
                      min={0}
                      step="0.01"
                      value={(t.unitPriceCents / 100).toString()}
                      onChange={(e) => {
                        const tiers = [...current.tiers];
                        tiers[i] = {
                          ...t,
                          unitPriceCents: Math.round((+e.target.value || 0) * 100),
                        };
                        setForm({ ...current, tiers });
                      }}
                    />
                    <button
                      style={btnGhost}
                      onClick={() =>
                        setForm({
                          ...current,
                          tiers: current.tiers.filter((_, j) => j !== i),
                        })
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  style={{ ...btnGhost, justifySelf: "start" }}
                  onClick={() =>
                    setForm({
                      ...current,
                      tiers: [...current.tiers, { minQty: 12, unitPriceCents: product.price_cents }],
                    })
                  }
                >
                  + Add price break
                </button>
              </div>
            </div>

            <button
              style={{ ...btnPrimary, marginTop: 16 }}
              disabled={settingsM.isPending}
              onClick={() =>
                settingsM.mutate({
                  data: {
                    businessId,
                    productId: product.id,
                    minOrderQty: current.minOrderQty,
                    casePack: current.casePack,
                    wholesaleOnly: current.wholesaleOnly,
                    wholesalePriceCents: current.wholesalePriceCents || null,
                    tiers: current.tiers,
                  },
                })
              }
            >
              {settingsM.isPending ? "Saving…" : "Save trade terms"}
            </button>
          </>
        )}
      </Card>

      {product && (
        <Card eyebrow="Variants" title="Size, colour & weight options">
          <div style={{ display: "grid", gap: 8 }}>
            {variants.length === 0 && (
              <div style={muted}>No variants — the product sells as a single SKU.</div>
            )}
            {variants.map((v, i) => (
              <div
                key={v.id ?? `new-${i}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr .8fr .8fr auto",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <input
                  style={input}
                  placeholder="Option (Size)"
                  value={v.optionName}
                  onChange={(e) => patch(i, { optionName: e.target.value })}
                />
                <input
                  style={input}
                  placeholder="Value (Large)"
                  value={v.optionValue}
                  onChange={(e) => patch(i, { optionValue: e.target.value })}
                />
                <input
                  style={input}
                  placeholder="SKU"
                  value={v.sku}
                  onChange={(e) => patch(i, { sku: e.target.value })}
                />
                <input
                  style={input}
                  type="number"
                  step="0.01"
                  title="Price difference"
                  value={(v.priceDeltaCents / 100).toString()}
                  onChange={(e) =>
                    patch(i, { priceDeltaCents: Math.round((+e.target.value || 0) * 100) })
                  }
                />
                <input
                  style={input}
                  type="number"
                  min={0}
                  title="Stock"
                  value={v.stockQty}
                  onChange={(e) => patch(i, { stockQty: Math.max(0, +e.target.value || 0) })}
                />
                <button
                  style={btnGhost}
                  onClick={() => setVariantDraft(variants.filter((_, j) => j !== i))}
                >
                  ✕
                </button>
              </div>
            ))}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                style={btnGhost}
                onClick={() =>
                  setVariantDraft([
                    ...variants,
                    {
                      optionName: "Size",
                      optionValue: "",
                      sku: "",
                      priceDeltaCents: 0,
                      stockQty: 0,
                    },
                  ])
                }
              >
                + Add variant
              </button>
              <button
                style={btnPrimary}
                disabled={variantsM.isPending}
                onClick={() =>
                  variantsM.mutate({
                    data: {
                      businessId,
                      productId: product.id,
                      variants: variants
                        .filter((v) => v.optionValue.trim())
                        .map((v) => ({
                          id: v.id,
                          optionName: v.optionName || "Option",
                          optionValue: v.optionValue,
                          sku: v.sku || undefined,
                          priceDeltaCents: v.priceDeltaCents,
                          stockQty: v.stockQty,
                        })),
                    },
                  })
                }
              >
                {variantsM.isPending ? "Saving…" : "Save variants"}
              </button>
            </div>
            <div style={{ ...muted, fontSize: 12.5 }}>
              Base price {money(product.price_cents)} — the price difference is added to it.
            </div>
          </div>
        </Card>
      )}

      <TradeAccounts businessId={businessId} accounts={data?.accounts ?? []} />
    </div>
  );

  function patch(i: number, next: Partial<VariantDraft>) {
    const copy = [...variants];
    copy[i] = { ...copy[i]!, ...next };
    setVariantDraft(copy);
  }
}

function TradeAccounts({
  businessId,
  accounts,
}: {
  businessId: string;
  accounts: any[];
}) {
  const qc = useQueryClient();
  const decide = useServerFn(decideTradeAccount);
  const m = useMutation({
    mutationFn: decide,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trade-catalog", businessId] }),
  });

  return (
    <Card eyebrow="Trade accounts" title="Buyer applications">
      {accounts.length === 0 ? (
        <div style={muted}>No trade applications yet.</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {accounts.map((a) => (
            <div
              key={a.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
                alignItems: "center",
                border: "1px solid rgba(255,255,255,.07)",
                borderRadius: 12,
                padding: "12px 14px",
              }}
            >
              <div>
                <div style={{ color: "#F0F2F5", fontWeight: 700, fontSize: 14 }}>
                  {a.company_name}
                </div>
                <div style={{ color: "#92A0AB", fontSize: 12.5 }}>
                  {[a.contact_email, a.contact_phone, a.tax_id ? `Tax ID ${a.tax_id}` : null]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </div>
                {a.note && (
                  <div style={{ color: "#92A0AB", fontSize: 12.5, marginTop: 4 }}>{a.note}</div>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <StatusPill
                  label={a.status}
                  tone={
                    (a.status === "approved"
                      ? "green"
                      : a.status === "rejected"
                        ? "red"
                        : "gold") as any
                  }
                />
                {a.status !== "approved" && (
                  <button
                    style={btnPrimary}
                    disabled={m.isPending}
                    onClick={() =>
                      m.mutate({ data: { businessId, id: a.id, status: "approved" } })
                    }
                  >
                    Approve
                  </button>
                )}
                {a.status !== "rejected" && (
                  <button
                    style={btnGhost}
                    disabled={m.isPending}
                    onClick={() =>
                      m.mutate({ data: { businessId, id: a.id, status: "rejected" } })
                    }
                  >
                    Reject
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

const muted: React.CSSProperties = { color: "#92A0AB", fontSize: 14 };

const lbl: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: ".08em",
  textTransform: "uppercase",
  color: "#92A0AB",
};

const input: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,.09)",
  borderRadius: 10,
  padding: "10px 12px",
  fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
  fontSize: 14,
  background: "#14202B",
  color: "#F0F2F5",
  outline: "none",
  minWidth: 0,
};

const btnPrimary: React.CSSProperties = {
  background: "#2DE2F2",
  color: "#031029",
  border: 0,
  borderRadius: 11,
  padding: "10px 16px",
  fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
  fontSize: 13,
  fontWeight: 800,
  cursor: "pointer",
};

const btnGhost: React.CSSProperties = {
  background: "transparent",
  color: "#F0F2F5",
  border: "1px solid rgba(255,255,255,.09)",
  borderRadius: 10,
  padding: "9px 13px",
  fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
};
