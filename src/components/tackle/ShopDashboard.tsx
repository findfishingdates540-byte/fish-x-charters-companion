import { useMemo, useState } from "react";
import {
  useSuspenseQuery,
  useMutation,
  useQueryClient,
  queryOptions,
} from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getShopOverview,
  upsertProduct,
  deleteProduct,
  updateOrderStatus,
} from "@/lib/tackle.functions";
import {
  OperatorShell,
  OperatorNavItem,
  KPICard,
  Card,
  StatusPill,
  money,
} from "@/components/operator/OperatorShell";

type Product = {
  id: string;
  sku: string | null;
  title: string;
  category: string | null;
  price_cents: number;
  stock_qty: number;
  low_stock_threshold: number;
  is_published: boolean;
  images: unknown;
};

type Order = {
  id: string;
  buyer_name: string | null;
  buyer_email: string | null;
  total_cents: number;
  status: string;
  created_at: string;
  items: { id: string; title: string; quantity: number; unit_price_cents: number }[];
};

const overviewQO = (businessId: string) =>
  queryOptions({
    queryKey: ["shop-overview", businessId],
    queryFn: () => getShopOverview({ data: { businessId } }),
  });

/**
 * Copy adapts per vertical: tackle_shop / gear_mfg / apparel.
 */
const KIND_COPY: Record<
  string,
  { workspaceKind: string; productLabel: string; ordersLabel: string; brand: string }
> = {
  tackle_shop: {
    workspaceKind: "Tackle Shop",
    productLabel: "Tackle",
    ordersLabel: "Orders",
    brand: "Live bait, terminal tackle, lures.",
  },
  bait_shop: {
    workspaceKind: "Bait & Tackle",
    productLabel: "Tackle",
    ordersLabel: "Orders",
    brand: "Live bait, terminal tackle, lures.",
  },
  gear_mfg: {
    workspaceKind: "Gear Manufacturer",
    productLabel: "Gear",
    ordersLabel: "Wholesale orders",
    brand: "Rods, reels, electronics, hard goods.",
  },
  apparel: {
    workspaceKind: "Apparel Brand",
    productLabel: "Apparel",
    ordersLabel: "Orders",
    brand: "Performance apparel & merch.",
  },
};

export function ShopDashboard({
  businessId,
  workspaceName,
  operatorName,
  categoryKey,
}: {
  businessId: string;
  workspaceName: string;
  operatorName: string;
  categoryKey: string;
}) {
  const copy = KIND_COPY[categoryKey] ?? KIND_COPY.tackle_shop;
  const { data } = useSuspenseQuery(overviewQO(businessId));
  const [active, setActive] = useState("overview");

  const nav: OperatorNavItem[] = [
    { key: "overview", label: "Overview", icon: <BoxIcon /> },
    { key: "products", label: copy.productLabel, icon: <TagIcon /> },
    {
      key: "orders",
      label: copy.ordersLabel,
      icon: <CartIcon />,
      badge: data.kpis.toShip || undefined,
    },
    { key: "settings", label: "Settings", icon: <GearIcon /> },
  ];

  const titles: Record<string, { t: string; s: string }> = {
    overview: { t: "Shop overview", s: "Revenue, orders and inventory health." },
    products: { t: `${copy.productLabel} catalog`, s: "Publish, edit, restock." },
    orders: { t: copy.ordersLabel, s: "Fulfillment queue and history." },
    settings: { t: "Settings", s: "Storefront profile and payouts." },
  };

  return (
    <OperatorShell
      workspaceName={workspaceName}
      workspaceKind={copy.workspaceKind}
      operatorName={operatorName}
      operatorRole={copy.brand}
      nav={nav}
      active={active}
      onNav={setActive}
      pageTitle={titles[active].t}
      pageSub={titles[active].s}
    >
      {active === "overview" && <Overview data={data} />}
      {active === "products" && <Products businessId={businessId} data={data} />}
      {active === "orders" && <Orders businessId={businessId} data={data} />}
      {active === "settings" && <Settings />}
    </OperatorShell>
  );
}

function Overview({ data }: { data: any }) {
  const k = data.kpis;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 18 }}>
        <KPICard label="Month gross" value={money(k.monthGrossCents)} trend="MTD" />
        <KPICard
          label="To ship"
          value={String(k.toShip)}
          trend={k.toShip ? "action" : "clear"}
          trendPositive={k.toShip === 0}
        />
        <KPICard label="Products live" value={`${k.publishedCount}/${k.totalProducts}`} />
        <KPICard
          label="Low stock"
          value={String(k.lowStockCount)}
          trend={k.lowStockCount ? "restock" : "ok"}
          trendPositive={k.lowStockCount === 0}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 18 }}>
        <Card eyebrow="Fulfillment" title="Latest orders">
          <OrderList rows={data.orders.slice(0, 6)} minimal />
        </Card>
        <Card eyebrow="Restock soon" title="Low stock">
          {data.lowStock.length === 0 ? (
            <div style={{ color: "#5c6b78", fontSize: 14 }}>All good — no low-stock items.</div>
          ) : (
            data.lowStock.map((p: Product) => (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 0",
                  borderBottom: "1px solid rgba(13,34,54,.06)",
                }}
              >
                <span
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: "#fbe9e8",
                    display: "grid",
                    placeItems: "center",
                    color: "#d8514a",
                    flex: "none",
                    fontWeight: 700,
                  }}
                >
                  !
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "#0d2236" }}>
                    {p.title}
                  </div>
                  <div style={{ fontSize: 12, color: "#5c6b78" }}>
                    {p.sku ? `SKU ${p.sku}` : "No SKU"}
                  </div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#d8514a" }}>
                  {p.stock_qty} left
                </span>
              </div>
            ))
          )}
        </Card>
      </div>
    </div>
  );
}

function Products({ businessId, data }: { businessId: string; data: any }) {
  const qc = useQueryClient();
  const upsertFn = useServerFn(upsertProduct);
  const deleteFn = useServerFn(deleteProduct);
  const [editing, setEditing] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);

  const upsertM = useMutation({
    mutationFn: upsertFn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shop-overview", businessId] });
      setEditing(null);
      setShowForm(false);
    },
  });
  const deleteM = useMutation({
    mutationFn: deleteFn,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shop-overview", businessId] }),
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Card
        title="Catalog"
        right={
          <button onClick={() => { setEditing(null); setShowForm(true); }} style={btnPrimary}>
            + Add product
          </button>
        }
      >
        {data.products.length === 0 ? (
          <Empty label="No products yet — add your first item." />
        ) : (
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.8fr .8fr .8fr .8fr .6fr",
                gap: 16,
                padding: "10px 4px 12px",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: ".1em",
                textTransform: "uppercase",
                color: "#5c6b78",
                borderBottom: "1px solid rgba(13,34,54,.10)",
              }}
            >
              <span>Product</span>
              <span>SKU</span>
              <span>Price</span>
              <span>Stock</span>
              <span>Live</span>
            </div>
            {data.products.map((p: Product) => (
              <button
                key={p.id}
                onClick={() => { setEditing(p); setShowForm(true); }}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.8fr .8fr .8fr .8fr .6fr",
                  gap: 16,
                  padding: "14px 4px",
                  borderBottom: "1px solid rgba(13,34,54,.06)",
                  alignItems: "center",
                  background: "transparent",
                  border: 0,
                  borderTop: 0,
                  width: "100%",
                  textAlign: "left",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#0d2236" }}>{p.title}</div>
                  <div style={{ fontSize: 12, color: "#5c6b78" }}>{p.category ?? "Uncategorised"}</div>
                </div>
                <span style={{ fontSize: 13, color: "#0d2236" }}>{p.sku ?? "—"}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#0d2236" }}>{money(p.price_cents)}</span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: p.stock_qty <= p.low_stock_threshold ? "#d8514a" : "#0d2236",
                  }}
                >
                  {p.stock_qty}
                </span>
                <StatusPill label={p.is_published ? "Live" : "Draft"} tone={p.is_published ? "green" : "muted"} />
              </button>
            ))}
          </div>
        )}
      </Card>

      {showForm && (
        <ProductForm
          initial={editing ?? undefined}
          saving={upsertM.isPending}
          onCancel={() => { setEditing(null); setShowForm(false); }}
          onSave={(v) =>
            upsertM.mutate({ data: { ...v, businessId, id: editing?.id } })
          }
          onDelete={
            editing
              ? () => deleteM.mutate({ data: { id: editing.id, businessId } })
              : undefined
          }
        />
      )}
    </div>
  );
}

function ProductForm({
  initial,
  onCancel,
  onSave,
  onDelete,
  saving,
}: {
  initial?: Product;
  onCancel: () => void;
  onSave: (v: {
    sku: string;
    title: string;
    description: string;
    category: string;
    priceCents: number;
    stockQty: number;
    lowStockThreshold: number;
    isPublished: boolean;
  }) => void;
  onDelete?: () => void;
  saving: boolean;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [sku, setSku] = useState(initial?.sku ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [price, setPrice] = useState(initial ? String(initial.price_cents / 100) : "");
  const [stock, setStock] = useState(initial ? String(initial.stock_qty) : "0");
  const [low, setLow] = useState(initial ? String(initial.low_stock_threshold) : "5");
  const [isPublished, setPublished] = useState(initial?.is_published ?? false);
  const [description, setDescription] = useState("");

  return (
    <Card title={initial ? "Edit product" : "Add product"}>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 14 }}>
        <Field label="Title">
          <input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="SKU">
          <input value={sku} onChange={(e) => setSku(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Category">
          <input value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Price $">
          <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Stock">
          <input type="number" value={stock} onChange={(e) => setStock(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Low-stock alert">
          <input type="number" value={low} onChange={(e) => setLow(e.target.value)} style={inputStyle} />
        </Field>
      </div>
      <div style={{ marginTop: 14 }}>
        <Field label="Description">
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ ...inputStyle, fontFamily: "inherit" }}
          />
        </Field>
      </div>
      <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 14, fontSize: 13, color: "#0d2236" }}>
        <input
          type="checkbox"
          checked={isPublished}
          onChange={(e) => setPublished(e.target.checked)}
        />
        Publish to marketplace
      </label>
      <div style={{ display: "flex", gap: 10, marginTop: 18, alignItems: "center" }}>
        <button
          disabled={saving || !title || !price}
          onClick={() =>
            onSave({
              title,
              sku,
              category,
              description,
              priceCents: Math.round(Number(price) * 100),
              stockQty: Number(stock) || 0,
              lowStockThreshold: Number(low) || 5,
              isPublished,
            })
          }
          style={btnPrimary}
        >
          {saving ? "Saving…" : "Save product"}
        </button>
        <button onClick={onCancel} style={btnGhost}>
          Cancel
        </button>
        {onDelete && (
          <button
            onClick={onDelete}
            style={{ ...btnGhost, marginLeft: "auto", color: "#d8514a", borderColor: "#fbe9e8" }}
          >
            Delete
          </button>
        )}
      </div>
    </Card>
  );
}

function Orders({ businessId, data }: { businessId: string; data: any }) {
  const [tab, setTab] = useState<"all" | "paid" | "shipped" | "delivered">("all");
  const filtered = useMemo(
    () =>
      tab === "all"
        ? data.orders
        : data.orders.filter((o: Order) => o.status === tab),
    [tab, data.orders],
  );

  return (
    <Card
      title="Orders"
      right={
        <div style={{ display: "flex", gap: 4, background: "#f4f6f8", borderRadius: 11, padding: 4 }}>
          {(["all", "paid", "shipped", "delivered"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              style={{
                background: tab === k ? "#0a2236" : "transparent",
                color: tab === k ? "#fff" : "#5c6b78",
                border: 0,
                borderRadius: 9,
                padding: "8px 14px",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                textTransform: "capitalize",
              }}
            >
              {k === "paid" ? "To ship" : k}
            </button>
          ))}
        </div>
      }
    >
      <OrderList rows={filtered} businessId={businessId} />
    </Card>
  );
}

function OrderList({
  rows,
  businessId,
  minimal,
}: {
  rows: Order[];
  businessId?: string;
  minimal?: boolean;
}) {
  const qc = useQueryClient();
  const shipFn = useServerFn(updateOrderStatus);
  const shipM = useMutation({
    mutationFn: shipFn,
    onSuccess: () =>
      businessId && qc.invalidateQueries({ queryKey: ["shop-overview", businessId] }),
  });

  if (!rows.length) return <Empty label="No orders here yet." />;
  const toneFor = (s: string) =>
    s === "delivered"
      ? "green"
      : s === "shipped"
        ? "cyan"
        : s === "paid"
          ? "gold"
          : s === "cancelled" || s === "refunded"
            ? "red"
            : "muted";
  return (
    <div>
      {rows.map((o) => (
        <div
          key={o.id}
          style={{
            display: "grid",
            gridTemplateColumns: minimal ? "1.5fr 1fr auto auto" : "1fr 1.5fr 1fr .8fr auto",
            gap: 14,
            padding: "14px 4px",
            borderBottom: "1px solid rgba(13,34,54,.06)",
            alignItems: "center",
          }}
        >
          {!minimal && (
            <span style={{ fontSize: 12.5, color: "#5c6b78", fontFamily: "monospace" }}>
              {o.id.slice(0, 8)}
            </span>
          )}
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#0d2236" }}>
              {o.buyer_name ?? o.buyer_email ?? "Guest"}
            </div>
            <div
              style={{
                fontSize: 12,
                color: "#5c6b78",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {o.items?.map((it) => `${it.quantity}× ${it.title}`).join(", ") || "—"}
            </div>
          </div>
          <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 17, fontWeight: 600, color: "#0d2236" }}>
            {money(o.total_cents)}
          </span>
          <StatusPill label={o.status} tone={toneFor(o.status) as any} />
          {!minimal && businessId && o.status === "paid" && (
            <button
              onClick={() =>
                shipM.mutate({ data: { id: o.id, businessId, status: "shipped" } })
              }
              style={{ ...btnPrimary, padding: "8px 12px", fontSize: 12 }}
            >
              Mark shipped
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function Settings() {
  return (
    <Card eyebrow="Payouts & storefront" title="Coming soon">
      <p style={{ color: "#5c6b78", fontSize: 14, lineHeight: 1.6, margin: 0 }}>
        Stripe payout linking, tax config, and shipping zones will surface here.
      </p>
    </Card>
  );
}

/* --- shared UI helpers --- */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: ".08em",
          textTransform: "uppercase",
          color: "#5c6b78",
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  border: "1px solid rgba(13,34,54,.14)",
  borderRadius: 10,
  padding: "10px 12px",
  fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
  fontSize: 14,
  background: "#fff",
  color: "#0d2236",
  outline: "none",
};

const btnPrimary: React.CSSProperties = {
  background: "#0a2236",
  color: "#fff",
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
  color: "#0d2236",
  border: "1px solid rgba(13,34,54,.14)",
  borderRadius: 11,
  padding: "10px 16px",
  fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

function Empty({ label }: { label: string }) {
  return (
    <div style={{ padding: "32px 10px", textAlign: "center", color: "#5c6b78", fontSize: 14 }}>
      {label}
    </div>
  );
}

/* icons */
function BoxIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
      <rect x="3" y="3" width="8" height="8" rx="2" />
      <rect x="13" y="3" width="8" height="8" rx="2" />
      <rect x="3" y="13" width="8" height="8" rx="2" />
      <rect x="13" y="13" width="8" height="8" rx="2" />
    </svg>
  );
}
function TagIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
      <path d="M20 12 12 20l-9-9V3h8l9 9z" />
      <circle cx="7" cy="7" r="1.4" />
    </svg>
  );
}
function CartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
      <path d="M3 3h2l2.4 12.2A2 2 0 0 0 9.4 17H18a2 2 0 0 0 2-1.6L21 8H6" />
      <circle cx="9" cy="21" r="1.4" />
      <circle cx="18" cy="21" r="1.4" />
    </svg>
  );
}
function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.7 1.7 0 0 0 19.4 9v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  );
}
