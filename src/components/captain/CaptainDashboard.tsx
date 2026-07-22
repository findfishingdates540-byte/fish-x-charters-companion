/**
 * Captain dashboard — React port of public/dashboards/captain.html,
 * wired to live Supabase data via getCaptainDashboard and the
 * captain-management server functions (bookings list, services CRUD,
 * earnings, messages).
 */
import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getCaptainDashboard } from "@/lib/captain-dashboard.functions";
import {
  listCaptainBookings,
  listCaptainConversations,
  getCaptainEarnings,
  upsertCaptainService,
  deleteCaptainService,
  toggleServicePublished,
} from "@/lib/captain-management.functions";

export const captainDashboardQO = queryOptions({
  queryKey: ["captain-dashboard"],
  queryFn: () => getCaptainDashboard(),
});

type Tab = "overview" | "bookings" | "services" | "messages" | "earnings" | "settings";

const money = (cents: number) =>
  `$${(Math.max(0, cents) / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const shell: React.CSSProperties = {
  ["--serif" as never]: "'Cormorant Garamond',Georgia,serif",
  ["--sans" as never]: "'Hanken Grotesk',system-ui,sans-serif",
  ["--ink" as never]: "#0d2236",
  ["--navy" as never]: "#0a2236",
  ["--paper" as never]: "#eef2f5",
  ["--card" as never]: "#ffffff",
  ["--sand" as never]: "#e3c089",
  ["--sandsoft" as never]: "#f4e6cd",
  ["--goldtext" as never]: "#a97e3c",
  ["--cyan" as never]: "#1f9fbe",
  ["--green" as never]: "#1f8a5b",
  ["--greensoft" as never]: "#e2f2ea",
  ["--ond" as never]: "#eaf1f6",
  ["--ondmut" as never]: "#93a7b7",
  ["--tmut" as never]: "#5c6b78",
  ["--line" as never]: "rgba(13,34,54,.10)",
  ["--lined" as never]: "rgba(255,255,255,.10)",
  display: "flex",
  minHeight: "100vh",
  background: "var(--paper)",
  color: "var(--ink)",
  fontFamily: "var(--sans)",
};

export function CaptainDashboard() {
  const { data } = useSuspenseQuery(captainDashboardQO);
  const [tab, setTab] = useState<Tab>("overview");
  const [accepting, setAccepting] = useState(true);
  const navigate = useNavigate();

  const biz = data.business;
  const initial = (data.profile?.display_name || data.profile?.full_name || "C")
    .trim()
    .charAt(0)
    .toUpperCase();

  const pageTitle: Record<Tab, string> = {
    overview: `Welcome back, Captain`,
    bookings: "Bookings",
    services: "Services",
    messages: "Messages",
    earnings: "Earnings",
    settings: "Settings",
  };
  const pageSub: Record<Tab, string> = {
    overview: biz ? `${biz.name} · ${[biz.city, biz.region].filter(Boolean).join(", ")}` : "Set up your business to see bookings.",
    bookings: `${data.stats.upcomingCount} upcoming · ${data.stats.completedCount} completed`,
    services: "Publish trips, manage pricing and availability",
    messages: "Guest conversations",
    earnings: "Payouts and escrow",
    settings: "Business & payout settings",
  };

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <div style={shell}>
      {/* SIDEBAR */}
      <aside style={{ width: 256, flex: "none", background: "var(--navy)", color: "var(--ond)", display: "flex", flexDirection: "column", padding: "22px 16px", position: "sticky", top: 0, height: "100vh", borderRight: "1px solid rgba(255,255,255,.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px 22px" }}>
          <span style={{ width: 11, height: 11, background: "var(--sand)", transform: "rotate(45deg)", display: "inline-block", borderRadius: 1 }} />
          <span style={{ fontFamily: "var(--serif)", fontWeight: 600, fontSize: 20, letterSpacing: ".1em" }}>FISH—X</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 11, background: "rgba(255,255,255,.05)", border: "1px solid var(--lined)", borderRadius: 13, padding: "11px 12px", marginBottom: 18 }}>
          <span style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(227,192,137,.16)", display: "grid", placeItems: "center", color: "var(--sand)", flex: "none", fontFamily: "var(--serif)", fontWeight: 600 }}>
            {biz?.name.charAt(0).toUpperCase() ?? "C"}
          </span>
          <div style={{ lineHeight: 1.2, minWidth: 0 }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--ondmut)" }}>Workspace</div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {biz?.name ?? "No business"}
            </div>
          </div>
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {(["overview", "bookings", "services", "messages", "earnings"] as Tab[]).map((t) => (
            <NavBtn key={t} label={cap(t)} active={tab === t} onClick={() => setTab(t)} badge={t === "bookings" ? data.stats.upcomingCount : undefined} />
          ))}
        </nav>
        <div style={{ marginTop: 20, paddingTop: 18, borderTop: "1px solid var(--lined)" }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--ondmut)", padding: "0 12px 8px" }}>Account</div>
          <NavBtn label="Settings" active={tab === "settings"} onClick={() => setTab("settings")} />
        </div>
        <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 11, background: "rgba(255,255,255,.05)", border: "1px solid var(--lined)", borderRadius: 13, padding: "10px 12px" }}>
          <div style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(227,192,137,.16)", display: "grid", placeItems: "center", color: "var(--sand)", fontFamily: "var(--serif)", fontWeight: 600 }}>{initial}</div>
          <div style={{ lineHeight: 1.25, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{data.profile?.display_name ?? data.profile?.full_name ?? "Captain"}</div>
            <div style={{ fontSize: 11, color: "var(--sand)" }}>{biz?.verified_at ? "★ Verified" : "Pending verification"}</div>
          </div>
          <button onClick={signOut} title="Sign out" style={{ marginLeft: "auto", background: "transparent", color: "var(--ondmut)", border: 0, cursor: "pointer", flex: "none" }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H3" /></svg>
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <header style={{ position: "sticky", top: 0, zIndex: 20, background: "rgba(238,242,245,.86)", backdropFilter: "saturate(140%) blur(12px)", borderBottom: "1px solid var(--line)", padding: "18px 34px", display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: "var(--serif)", fontWeight: 600, fontSize: 26, lineHeight: 1.1, color: "var(--ink)" }}>{pageTitle[tab]}</div>
            <div style={{ fontSize: 13, color: "var(--tmut)", marginTop: 1 }}>{pageSub[tab]}</div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--card)", border: "1px solid var(--line)", borderRadius: 30, padding: "5px 6px 5px 14px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: accepting ? "var(--green)" : "#d8514a" }} />
                <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>{accepting ? "Accepting" : "Paused"}</span>
              </span>
              <button
                onClick={() => setAccepting((v) => !v)}
                style={{ position: "relative", width: 40, height: 23, borderRadius: 20, border: 0, cursor: "pointer", background: accepting ? "var(--green)" : "#d8514a", padding: 0 }}
              >
                <span style={{ position: "absolute", top: 2, left: accepting ? 19 : 2, width: 19, height: 19, borderRadius: "50%", background: "#fff", transition: "left .3s", boxShadow: "0 1px 3px rgba(0,0,0,.3)" }} />
              </button>
            </div>
          </div>
        </header>

        <main style={{ flex: 1, padding: "30px 34px 48px", maxWidth: 1180, width: "100%" }}>
          {tab === "overview" && <OverviewPanel data={data} onGoto={setTab} />}
          {tab === "bookings" && <BookingsPanel />}
          {tab === "services" && <ServicesPanel data={data} />}
          {tab === "messages" && <MessagesPanel />}
          {tab === "earnings" && <EarningsPanel />}
          {tab === "settings" && <SettingsPanel data={data} />}
        </main>
      </div>
    </div>
  );
}

function cap(t: string) {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function NavBtn({ label, active, onClick, badge }: { label: string; active: boolean; onClick: () => void; badge?: number }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        width: "100%",
        background: active ? "rgba(227,192,137,.14)" : "transparent",
        border: 0,
        borderRadius: 11,
        padding: "11px 12px",
        cursor: "pointer",
        fontFamily: "var(--sans)",
        fontSize: 14,
        fontWeight: 600,
        color: active ? "#fff" : "var(--ondmut)",
        textAlign: "left",
      }}
    >
      {label}
      {badge ? (
        <span style={{ marginLeft: "auto", background: "var(--sand)", color: "#1c1303", fontSize: 11, fontWeight: 700, borderRadius: 20, padding: "1px 8px" }}>{badge}</span>
      ) : null}
    </button>
  );
}

type CaptainData = Awaited<ReturnType<typeof getCaptainDashboard>>;

/* ---------------- OVERVIEW ---------------- */

function OverviewPanel({ data, onGoto }: { data: CaptainData; onGoto: (t: Tab) => void }) {
  const { stats, upcoming, services } = data;
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 18, marginBottom: 22 }}>
        <KpiCard label="This month" value={money(stats.grossCents)} sub="Gross earnings" />
        <KpiCard label="Upcoming" value={String(stats.upcomingCount)} sub="Trips booked" />
        <KpiCard label="In escrow" value={money(stats.escrowCents)} sub="Held until completed" />
        <KpiCard label="Completed" value={String(stats.completedCount)} sub="Lifetime trips" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 18, marginBottom: 22 }}>
        <Panel title="Upcoming bookings" action={{ label: "View all →", onClick: () => onGoto("bookings") }}>
          {upcoming.length === 0 && <Empty text="No upcoming trips yet." />}
          {upcoming.map((b, i) => (
            <Link
              key={b.id}
              to="/bookings/detail"
              search={{ id: b.id }}
              style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 0", borderBottom: i < upcoming.length - 1 ? "1px solid var(--line)" : "none", textDecoration: "none", color: "inherit" }}
            >
              <img src={b.service?.hero_url || "/dashboards/assets/seascape.jpg"} alt="" style={{ width: 56, height: 56, borderRadius: 12, objectFit: "cover", flex: "none" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{b.service?.title ?? "Charter"}</div>
                <div style={{ fontSize: 12.5, color: "var(--tmut)" }}>
                  {new Date(b.trip_date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                  {b.start_time ? ` · ${b.start_time.slice(0, 5)}` : ""}
                  {b.party_size ? ` · ${b.party_size} guests` : ""}
                </div>
              </div>
              <StatusPill status={b.status} />
              <div style={{ fontFamily: "var(--serif)", fontSize: 18, color: "var(--goldtext)", fontWeight: 600, marginLeft: 12 }}>{money(b.total_cents ?? 0)}</div>
            </Link>
          ))}
        </Panel>

        <Panel title="Your services" action={{ label: "Manage →", onClick: () => onGoto("services") }}>
          {services.length === 0 && <Empty text="Publish a trip to start receiving bookings." />}
          {services.map((s, i) => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: i < services.length - 1 ? "1px solid var(--line)" : "none" }}>
              <img src={s.hero_url || "/dashboards/assets/seascape.jpg"} alt="" style={{ width: 46, height: 46, borderRadius: 10, objectFit: "cover", flex: "none" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title}</div>
                <div style={{ fontSize: 12, color: "var(--tmut)" }}>{money(s.base_price_cents ?? 0)} · up to {s.capacity ?? "—"}</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 20, padding: "2px 9px", color: s.is_published ? "var(--green)" : "var(--tmut)", background: s.is_published ? "var(--greensoft)" : "var(--line)" }}>
                {s.is_published ? "Live" : "Draft"}
              </span>
            </div>
          ))}
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- BOOKINGS ---------------- */

const BOOKING_FILTERS = [
  { key: "all", label: "All" },
  { key: "pending_confirmation", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "in_progress", label: "In progress" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
] as const;

function BookingsPanel() {
  const [filter, setFilter] = useState<(typeof BOOKING_FILTERS)[number]["key"]>("all");
  const fn = useServerFn(listCaptainBookings);
  const { data, isLoading } = useQuery({
    queryKey: ["captain-bookings", filter],
    queryFn: () => fn({ data: { status: filter as any } }),
  });
  const rows = data?.rows ?? [];
  return (
    <Panel title="All bookings">
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {BOOKING_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: "6px 12px",
              borderRadius: 20,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
              border: "1px solid var(--line)",
              background: filter === f.key ? "var(--ink)" : "transparent",
              color: filter === f.key ? "#fff" : "var(--tmut)",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>
      {isLoading && <Empty text="Loading…" />}
      {!isLoading && rows.length === 0 && <Empty text="No bookings match this filter." />}
      {rows.map((b: any, i: number) => (
        <Link
          key={b.id}
          to="/bookings/detail"
          search={{ id: b.id }}
          style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderBottom: i < rows.length - 1 ? "1px solid var(--line)" : "none", textDecoration: "none", color: "inherit" }}
        >
          <img src={b.service?.hero_url || "/dashboards/assets/seascape.jpg"} alt="" style={{ width: 52, height: 52, borderRadius: 11, objectFit: "cover", flex: "none" }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{b.service?.title ?? "Charter"}</div>
            <div style={{ fontSize: 12.5, color: "var(--tmut)" }}>
              {new Date(b.trip_date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
              {b.customer_name ? ` · ${b.customer_name}` : ""}
              {b.party_size ? ` · ${b.party_size} guests` : ""}
            </div>
          </div>
          <StatusPill status={b.status} />
          <div style={{ fontFamily: "var(--serif)", fontSize: 17, color: "var(--goldtext)", fontWeight: 600, marginLeft: 12, minWidth: 90, textAlign: "right" }}>{money(b.total_cents ?? 0)}</div>
        </Link>
      ))}
    </Panel>
  );
}

/* ---------------- SERVICES ---------------- */

type ServiceRow = CaptainData["services"][number];
type ServiceDraft = {
  id?: string;
  title: string;
  kind: string;
  description: string;
  hero_url: string;
  base_price_cents: number;
  deposit_cents: number;
  capacity: number;
  duration_minutes: number;
  departure_location: string;
  is_published: boolean;
};

const emptyDraft: ServiceDraft = {
  title: "",
  kind: "charter",
  description: "",
  hero_url: "",
  base_price_cents: 0,
  deposit_cents: 0,
  capacity: 4,
  duration_minutes: 240,
  departure_location: "",
  is_published: false,
};

function ServicesPanel({ data }: { data: CaptainData }) {
  const qc = useQueryClient();
  const upsert = useServerFn(upsertCaptainService);
  const del = useServerFn(deleteCaptainService);
  const toggle = useServerFn(toggleServicePublished);
  const [editing, setEditing] = useState<ServiceDraft | null>(null);

  const mUpsert = useMutation({
    mutationFn: (draft: ServiceDraft) => upsert({ data: {
      id: draft.id,
      title: draft.title,
      kind: draft.kind as any,
      description: draft.description || null,
      hero_url: draft.hero_url || null,
      base_price_cents: Math.round(draft.base_price_cents),
      deposit_cents: Math.round(draft.deposit_cents),
      capacity: draft.capacity,
      duration_minutes: draft.duration_minutes || null,
      departure_location: draft.departure_location || null,
      target_species: [],
      includes: [],
      is_published: draft.is_published,
    } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["captain-dashboard"] });
      setEditing(null);
    },
  });

  const mDelete = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["captain-dashboard"] }),
  });

  const mToggle = useMutation({
    mutationFn: (v: { id: string; is_published: boolean }) => toggle({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["captain-dashboard"] }),
  });

  return (
    <Panel
      title="Services"
      action={{ label: "+ New service", onClick: () => setEditing({ ...emptyDraft }) }}
    >
      {editing && (
        <ServiceForm
          draft={editing}
          onChange={setEditing}
          onCancel={() => setEditing(null)}
          onSave={() => mUpsert.mutate(editing)}
          saving={mUpsert.isPending}
          error={mUpsert.error ? String(mUpsert.error) : null}
        />
      )}

      {data.services.length === 0 && !editing && <Empty text="No services yet. Add your first trip." />}

      {data.services.map((s: ServiceRow, i: number) => (
        <div
          key={s.id}
          style={{
            display: "flex", alignItems: "center", gap: 14, padding: "14px 0",
            borderBottom: i < data.services.length - 1 ? "1px solid var(--line)" : "none",
          }}
        >
          <img src={s.hero_url || "/dashboards/assets/seascape.jpg"} alt="" style={{ width: 56, height: 56, borderRadius: 12, objectFit: "cover", flex: "none" }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{s.title}</div>
            <div style={{ fontSize: 12.5, color: "var(--tmut)" }}>{money(s.base_price_cents ?? 0)} · up to {s.capacity ?? "—"} guests</div>
          </div>
          <button
            onClick={() => mToggle.mutate({ id: s.id, is_published: !s.is_published })}
            style={{ border: "1px solid var(--line)", background: "transparent", borderRadius: 20, padding: "5px 11px", fontSize: 12, fontWeight: 600, cursor: "pointer", color: s.is_published ? "var(--green)" : "var(--tmut)" }}
          >
            {s.is_published ? "Live" : "Draft"}
          </button>
          <button
            onClick={() => setEditing({
              id: s.id,
              title: s.title,
              kind: (s as any).kind ?? "charter",
              description: "",
              hero_url: s.hero_url ?? "",
              base_price_cents: s.base_price_cents ?? 0,
              deposit_cents: 0,
              capacity: s.capacity ?? 4,
              duration_minutes: 240,
              departure_location: "",
              is_published: s.is_published,
            })}
            style={{ border: 0, background: "transparent", cursor: "pointer", fontSize: 13, color: "var(--goldtext)", fontWeight: 600 }}
          >
            Edit
          </button>
          <button
            onClick={() => { if (confirm(`Delete "${s.title}"?`)) mDelete.mutate(s.id); }}
            style={{ border: 0, background: "transparent", cursor: "pointer", fontSize: 13, color: "#d8514a" }}
          >
            Delete
          </button>
        </div>
      ))}
    </Panel>
  );
}

function ServiceForm({ draft, onChange, onCancel, onSave, saving, error }: {
  draft: ServiceDraft;
  onChange: (d: ServiceDraft) => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
  error: string | null;
}) {
  const upd = (patch: Partial<ServiceDraft>) => onChange({ ...draft, ...patch });
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSave(); }}
      style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 14, padding: 18, marginBottom: 16, display: "grid", gap: 12 }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
        <Field label="Title"><input required value={draft.title} onChange={(e) => upd({ title: e.target.value })} style={input} /></Field>
        <Field label="Kind">
          <select value={draft.kind} onChange={(e) => upd({ kind: e.target.value })} style={input}>
            <option value="charter">Charter</option>
            <option value="guided_trip">Guided trip</option>
            <option value="rental">Rental</option>
            <option value="lesson">Lesson</option>
            <option value="workshop">Workshop</option>
            <option value="slip_rental">Slip rental</option>
            <option value="custom">Custom</option>
          </select>
        </Field>
      </div>
      <Field label="Description">
        <textarea value={draft.description} onChange={(e) => upd({ description: e.target.value })} rows={3} style={{ ...input, resize: "vertical" }} />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        <Field label="Base price ($)"><input type="number" min={0} value={draft.base_price_cents / 100} onChange={(e) => upd({ base_price_cents: Math.round(Number(e.target.value) * 100) })} style={input} /></Field>
        <Field label="Deposit ($)"><input type="number" min={0} value={draft.deposit_cents / 100} onChange={(e) => upd({ deposit_cents: Math.round(Number(e.target.value) * 100) })} style={input} /></Field>
        <Field label="Capacity"><input type="number" min={1} max={50} value={draft.capacity} onChange={(e) => upd({ capacity: Number(e.target.value) })} style={input} /></Field>
        <Field label="Duration (min)"><input type="number" min={30} step={15} value={draft.duration_minutes} onChange={(e) => upd({ duration_minutes: Number(e.target.value) })} style={input} /></Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
        <Field label="Departure location"><input value={draft.departure_location} onChange={(e) => upd({ departure_location: e.target.value })} style={input} /></Field>
        <Field label="Hero image URL"><input value={draft.hero_url} onChange={(e) => upd({ hero_url: e.target.value })} style={input} placeholder="https://…" /></Field>
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
        <input type="checkbox" checked={draft.is_published} onChange={(e) => upd({ is_published: e.target.checked })} />
        Publish immediately (visible on marketplace)
      </label>
      {error && <div style={{ color: "#d8514a", fontSize: 12.5 }}>{error}</div>}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button type="button" onClick={onCancel} style={btnGhost}>Cancel</button>
        <button type="submit" disabled={saving} style={btnPrimary}>{saving ? "Saving…" : draft.id ? "Save changes" : "Create service"}</button>
      </div>
    </form>
  );
}

const input: React.CSSProperties = { width: "100%", border: "1px solid var(--line)", borderRadius: 10, padding: "9px 12px", fontSize: 13.5, fontFamily: "var(--sans)", background: "#fff", color: "var(--ink)" };
const btnPrimary: React.CSSProperties = { background: "var(--ink)", color: "#fff", border: 0, borderRadius: 20, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" };
const btnGhost: React.CSSProperties = { background: "transparent", color: "var(--tmut)", border: "1px solid var(--line)", borderRadius: 20, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 5 }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--tmut)" }}>{label}</span>
      {children}
    </label>
  );
}

/* ---------------- EARNINGS ---------------- */

function EarningsPanel() {
  const fn = useServerFn(getCaptainEarnings);
  const { data, isLoading } = useQuery({ queryKey: ["captain-earnings"], queryFn: () => fn() });
  if (isLoading || !data) return <Empty text="Loading…" />;
  const maxMonth = Math.max(1, ...data.monthly.map((m) => m.cents));
  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 18 }}>
        <KpiCard label="Gross" value={money(data.totals.grossCents)} sub="Completed trips" />
        <KpiCard label="Platform fee (10%)" value={money(data.totals.feeCents)} sub="Fish-X commission" />
        <KpiCard label="Net earnings" value={money(data.totals.netCents)} sub="Your payout" />
        <KpiCard label="In escrow" value={money(data.totals.escrowCents)} sub="Releases on completion" />
      </div>

      <Panel title="Monthly gross">
        {data.monthly.length === 0 && <Empty text="No completed trips yet." />}
        {data.monthly.length > 0 && (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 180, padding: "10px 0" }}>
            {data.monthly.map((m) => (
              <div key={m.ym} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--goldtext)" }}>{money(m.cents)}</div>
                <div
                  style={{
                    width: "100%",
                    height: `${(m.cents / maxMonth) * 140}px`,
                    minHeight: 4,
                    background: "linear-gradient(180deg,var(--sand),var(--goldtext))",
                    borderRadius: "6px 6px 0 0",
                  }}
                />
                <div style={{ fontSize: 11, color: "var(--tmut)" }}>{m.ym}</div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="By service">
        {data.byService.length === 0 && <Empty text="No breakdown yet." />}
        {data.byService.map((s, i) => (
          <div key={s.title} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: i < data.byService.length - 1 ? "1px solid var(--line)" : "none" }}>
            <div style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>{s.title}</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 17, color: "var(--goldtext)", fontWeight: 600 }}>{money(s.cents)}</div>
          </div>
        ))}
      </Panel>
    </div>
  );
}

/* ---------------- MESSAGES ---------------- */

function MessagesPanel() {
  const fn = useServerFn(listCaptainConversations);
  const { data, isLoading } = useQuery({ queryKey: ["captain-conversations"], queryFn: () => fn() });
  if (isLoading) return <Empty text="Loading conversations…" />;
  const rows = data ?? [];
  return (
    <Panel title="Recent conversations">
      {rows.length === 0 && <Empty text="No messages yet. Guest messages will appear here after a booking." />}
      {rows.map((c: any, i: number) => (
        <Link
          key={c.booking_id}
          to="/bookings/detail"
          search={{ id: c.booking_id }}
          style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderBottom: i < rows.length - 1 ? "1px solid var(--line)" : "none", textDecoration: "none", color: "inherit" }}
        >
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(31,159,190,.12)", color: "var(--cyan)", display: "grid", placeItems: "center", fontFamily: "var(--serif)", fontWeight: 600, fontSize: 18 }}>
            {(c.customer_name || "G").charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{c.customer_name}</span>
              <span style={{ fontSize: 12, color: "var(--tmut)" }}>· {c.trip_title}</span>
              {c.unread_count > 0 && (
                <span style={{ marginLeft: 6, background: "var(--sand)", color: "#1c1303", fontSize: 11, fontWeight: 700, borderRadius: 20, padding: "1px 8px" }}>{c.unread_count}</span>
              )}
            </div>
            <div style={{ fontSize: 13, color: "var(--tmut)", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {c.last_message?.body ?? "—"}
            </div>
          </div>
          <div style={{ fontSize: 12, color: "var(--tmut)", flex: "none" }}>
            {c.last_message?.created_at ? new Date(c.last_message.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""}
          </div>
        </Link>
      ))}
    </Panel>
  );
}

/* ---------------- SETTINGS ---------------- */

function SettingsPanel({ data }: { data: CaptainData }) {
  const biz = data.business;
  return (
    <div style={{ display: "grid", gap: 18 }}>
      <Panel title="Business profile">
        {!biz && <Empty text="Complete onboarding to set up your business." />}
        {biz && (
          <div style={{ display: "grid", gap: 10, fontSize: 13.5 }}>
            <Row k="Name" v={biz.name} />
            <Row k="Location" v={[biz.city, biz.region].filter(Boolean).join(", ") || "—"} />
            <Row k="Category" v={biz.category_key ?? "—"} />
            <Row k="Status" v={biz.is_published ? "Published" : "Draft"} />
            <Row k="Verification" v={biz.verified_at ? "★ Verified" : "Pending"} />
            <div style={{ marginTop: 8 }}>
              <Link to="/onboarding" style={{ color: "var(--goldtext)", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                Edit business →
              </Link>
            </div>
          </div>
        )}
      </Panel>
      <Panel title="Payouts">
        <div style={{ fontSize: 13.5, color: "var(--tmut)", lineHeight: 1.6 }}>
          Fish-X uses Stripe Connect for payouts. Funds are held in escrow and released 24 hours after trip completion.
          Payout configuration will be enabled once your Stripe account is connected.
        </div>
      </Panel>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--line)" }}>
      <span style={{ color: "var(--tmut)", fontWeight: 600 }}>{k}</span>
      <span style={{ color: "var(--ink)" }}>{v}</span>
    </div>
  );
}

/* ---------------- SHARED ---------------- */

function KpiCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 18, padding: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--tmut)", marginBottom: 12 }}>{label}</div>
      <div style={{ fontFamily: "var(--serif)", fontWeight: 600, fontSize: 30, lineHeight: 1, color: "var(--ink)" }}>{value}</div>
      <div style={{ fontSize: 12.5, color: "var(--tmut)", marginTop: 6 }}>{sub}</div>
    </div>
  );
}

function Panel({ title, action, children }: { title: string; action?: { label: string; onClick: () => void }; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 20, padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontFamily: "var(--serif)", fontWeight: 600, fontSize: 21, color: "var(--ink)" }}>{title}</div>
        {action && (
          <button onClick={action.onClick} style={{ background: "transparent", border: 0, color: "var(--goldtext)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            {action.label}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div style={{ padding: "24px 0", fontSize: 13.5, color: "var(--tmut)", textAlign: "center" }}>{text}</div>;
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    pending_payment: { bg: "#fdf3d9", fg: "#a97e3c", label: "Awaiting payment" },
    pending_confirmation: { bg: "#fdf3d9", fg: "#a97e3c", label: "Pending" },
    confirmed: { bg: "#e2eef2", fg: "#1f9fbe", label: "In escrow" },
    in_progress: { bg: "#e2f2ea", fg: "#1f8a5b", label: "In progress" },
    completed: { bg: "#e2f2ea", fg: "#1f8a5b", label: "Completed" },
    reviewed: { bg: "#e2f2ea", fg: "#1f8a5b", label: "Reviewed" },
    cancelled: { bg: "rgba(216,81,74,.12)", fg: "#d8514a", label: "Cancelled" },
    refunded: { bg: "rgba(216,81,74,.12)", fg: "#d8514a", label: "Refunded" },
  };
  const cfg = map[status] ?? { bg: "rgba(13,34,54,.08)", fg: "#5c6b78", label: status.replace(/_/g, " ") };
  return (
    <span style={{ fontSize: 11, fontWeight: 700, background: cfg.bg, color: cfg.fg, borderRadius: 20, padding: "3px 9px", flex: "none", textTransform: "capitalize" }}>
      {cfg.label}
    </span>
  );
}
