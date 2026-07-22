/**
 * Captain dashboard — React port of public/dashboards/captain.html,
 * wired to live Supabase data via getCaptainDashboard.
 */
import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getCaptainDashboard } from "@/lib/captain-dashboard.functions";

export const captainDashboardQO = queryOptions({
  queryKey: ["captain-dashboard"],
  queryFn: () => getCaptainDashboard(),
});

type Tab = "overview" | "bookings" | "calendar" | "messages" | "earnings" | "settings";

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
    calendar: "Calendar",
    messages: "Messages",
    earnings: "Earnings",
    settings: "Settings",
  };
  const pageSub: Record<Tab, string> = {
    overview: biz ? `${biz.name} · ${[biz.city, biz.region].filter(Boolean).join(", ")}` : "Set up your business to see bookings.",
    bookings: `${data.stats.upcomingCount} upcoming · ${data.stats.completedCount} completed`,
    calendar: "Manage your availability",
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
          {(["overview", "bookings", "calendar", "messages", "earnings"] as Tab[]).map((t) => (
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
          {tab === "overview" && <OverviewPanel data={data} />}
          {tab === "bookings" && <BookingsPanel data={data} />}
          {tab === "calendar" && <PlaceholderPanel title="Calendar" body="Manage availability, boat schedules, and blackouts. Coming soon." />}
          {tab === "messages" && <PlaceholderPanel title="Messages" body="Guest conversations will appear here." />}
          {tab === "earnings" && <EarningsPanel data={data} />}
          {tab === "settings" && <PlaceholderPanel title="Settings" body="Business, payout, and notification settings." />}
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

function OverviewPanel({ data }: { data: CaptainData }) {
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
        <Panel title="Upcoming bookings" action={{ label: "View all →", onClick: () => {} }}>
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

        <Panel title="Your services">
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

function BookingsPanel({ data }: { data: CaptainData }) {
  const rows = useMemo(() => [...data.upcoming, ...data.recent.filter((r) => !data.upcoming.some((u) => u.id === r.id))], [data]);
  return (
    <Panel title="All bookings">
      {rows.length === 0 && <Empty text="No bookings yet." />}
      {rows.map((b, i) => (
        <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderBottom: i < rows.length - 1 ? "1px solid var(--line)" : "none" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{b.service?.title ?? "Charter"}</div>
            <div style={{ fontSize: 12.5, color: "var(--tmut)" }}>{new Date(b.trip_date).toLocaleDateString()}</div>
          </div>
          <StatusPill status={b.status} />
          <div style={{ fontFamily: "var(--serif)", fontSize: 17, color: "var(--goldtext)", fontWeight: 600, marginLeft: 12, minWidth: 90, textAlign: "right" }}>{money(b.total_cents ?? 0)}</div>
        </div>
      ))}
    </Panel>
  );
}

function EarningsPanel({ data }: { data: CaptainData }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18 }}>
      <KpiCard label="Month to date" value={money(data.stats.grossCents)} sub="Gross earnings" />
      <KpiCard label="In escrow" value={money(data.stats.escrowCents)} sub="Releases on trip completion" />
      <KpiCard label="Completed trips" value={String(data.stats.completedCount)} sub="Lifetime" />
    </div>
  );
}

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

function PlaceholderPanel({ title, body }: { title: string; body: string }) {
  return (
    <Panel title={title}>
      <div style={{ padding: "36px 0", textAlign: "center", color: "var(--tmut)", fontSize: 13.5 }}>{body}</div>
    </Panel>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    pending_payment: { bg: "#fdf3d9", fg: "#a97e3c", label: "Awaiting payment" },
    pending_confirmation: { bg: "#fdf3d9", fg: "#a97e3c", label: "Pending" },
    confirmed: { bg: "#e2eef2", fg: "#1f9fbe", label: "In escrow" },
    in_progress: { bg: "#e2f2ea", fg: "#1f8a5b", label: "In progress" },
    completed: { bg: "#e2f2ea", fg: "#1f8a5b", label: "Completed" },
    reviewed: { bg: "#e2f2ea", fg: "#1f8a5b", label: "Reviewed" },
  };
  const cfg = map[status] ?? { bg: "rgba(13,34,54,.08)", fg: "#5c6b78", label: status.replace(/_/g, " ") };
  return (
    <span style={{ fontSize: 11, fontWeight: 700, background: cfg.bg, color: cfg.fg, borderRadius: 20, padding: "3px 9px", flex: "none", textTransform: "capitalize" }}>
      {cfg.label}
    </span>
  );
}
