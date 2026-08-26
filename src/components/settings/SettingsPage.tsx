/**
 * Unified Settings screen for every account type.
 *
 * Sections:
 *  - Personal details (all users) — reuses AnglerAccount in embedded mode
 *  - Security (password change, sign out)
 *  - One section per business the signed-in user belongs to (operators),
 *    rendering the shared BusinessSettings screen.
 */
import { Suspense, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyBusinesses } from "@/lib/my-businesses.functions";
import { AnglerAccount } from "@/components/profile/AnglerAccount";
import { BusinessSettings } from "@/components/business/BusinessSettings";
import { supabase } from "@/integrations/supabase/client";

const V = {
  serif: "'Cormorant Garamond',Georgia,serif",
  sans: "'Hanken Grotesk',system-ui,sans-serif",
  ink: "#0d2236",
  navy: "#0a2236",
  paper: "#eef2f5",
  card: "#ffffff",
  sand: "#e3c089",
  sandsoft: "#f4e6cd",
  goldtext: "#a97e3c",
  ond: "#eaf1f6",
  ondmut: "#93a7b7",
  tmut: "#5c6b78",
  line: "rgba(13,34,54,.10)",
};

export function SettingsPage() {
  const fetchBiz = useServerFn(getMyBusinesses);
  const { data: memberships = [] } = useQuery({
    queryKey: ["my-businesses"],
    queryFn: () => fetchBiz(),
  });

  const [active, setActive] = useState<string>("personal");

  const items = [
    { key: "personal", label: "Personal details", hint: "Name, photo, contact" },
    { key: "security", label: "Sign-in & security", hint: "Password, sessions" },
    ...memberships.map((m: any) => ({
      key: `biz:${m.business.id}`,
      label: m.business.name,
      hint: `${m.role} · business settings`,
    })),
  ];

  const activeBiz = active.startsWith("biz:") ? active.slice(4) : null;

  return (
    <div style={{ minHeight: "100vh", background: V.paper, color: V.ink, fontFamily: V.sans }}>
      <header style={{ position: "sticky", top: 0, zIndex: 30, background: V.navy, color: V.ond }}>
        <div
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            padding: "0 24px",
            height: 62,
            display: "flex",
            alignItems: "center",
            gap: 22,
          }}
        >
          <Link
            to="/dashboard"
            style={{ color: V.ondmut, textDecoration: "none", fontSize: 13, fontWeight: 600 }}
          >
            ← Back
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "0 auto" }}>
            <span
              style={{
                width: 10,
                height: 10,
                background: V.sand,
                transform: "rotate(45deg)",
                display: "inline-block",
                borderRadius: 1,
              }}
            />
            <span style={{ fontFamily: V.serif, fontWeight: 600, fontSize: 19, whiteSpace: "nowrap" }}>
              FISH-X.COM
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: ".16em",
                textTransform: "uppercase",
                color: V.sand,
                marginLeft: 4,
              }}
            >
              Settings
            </span>
          </div>
          <span style={{ width: 52 }} />
        </div>
      </header>

      <main
        className="fx-settings"
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "28px 24px 64px",
          display: "grid",
          gridTemplateColumns: "252px minmax(0,1fr)",
          gap: 24,
          alignItems: "start",
        }}
      >
        <nav
          style={{
            background: V.card,
            border: `1px solid ${V.line}`,
            borderRadius: 18,
            padding: 10,
            display: "grid",
            gap: 4,
            position: "sticky",
            top: 86,
          }}
        >
          {items.map((it) => {
            const on = active === it.key;
            return (
              <button
                key={it.key}
                onClick={() => setActive(it.key)}
                style={{
                  textAlign: "left",
                  border: 0,
                  cursor: "pointer",
                  background: on ? V.sandsoft : "transparent",
                  borderRadius: 12,
                  padding: "11px 13px",
                  fontFamily: V.sans,
                }}
              >
                <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: on ? V.goldtext : V.ink }}>
                  {it.label}
                </span>
                <span style={{ display: "block", fontSize: 12, color: V.tmut, marginTop: 2 }}>{it.hint}</span>
              </button>
            );
          })}
        </nav>

        <section style={{ minWidth: 0 }}>
          {active === "personal" && (
            <Suspense fallback={<Muted>Loading your details…</Muted>}>
              <SectionHead title="Personal details" sub="How you appear to captains, vendors and guides." />
              <AnglerAccount embedded />
            </Suspense>
          )}

          {active === "security" && (
            <>
              <SectionHead title="Sign-in & security" sub="Change your password or sign out of this device." />
              <SecurityCard />
            </>
          )}

          {activeBiz && (
            <>
              <SectionHead
                title={items.find((i) => i.key === active)?.label ?? "Business"}
                sub="Storefront profile, hours, team, notifications and payouts."
              />
              <BusinessSettings businessId={activeBiz} />
            </>
          )}
        </section>
      </main>
    </div>
  );
}

function SectionHead({ title, sub }: { title: string; sub: string }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <h1 style={{ fontFamily: V.serif, fontSize: 28, fontWeight: 600, margin: "0 0 4px", color: V.ink }}>
        {title}
      </h1>
      <p style={{ fontSize: 14, color: V.tmut, margin: 0 }}>{sub}</p>
    </div>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 14, color: V.tmut, padding: 20 }}>{children}</div>;
}

function SecurityCard() {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setMsg("");
    if (pw.length < 8) return setMsg("Use at least 8 characters.");
    if (pw !== pw2) return setMsg("Those passwords don't match.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setMsg(error.message);
    setPw("");
    setPw2("");
    setMsg("Password updated.");
  };

  const field: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    background: V.paper,
    border: `1px solid ${V.line}`,
    borderRadius: 11,
    padding: "12px 14px",
    fontFamily: V.sans,
    fontSize: 14,
    color: V.ink,
    outline: "none",
  };

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div style={{ background: V.card, border: `1px solid ${V.line}`, borderRadius: 20, padding: 26 }}>
        <div style={{ fontFamily: V.serif, fontSize: 18, fontWeight: 600, marginBottom: 18 }}>
          Change password
        </div>
        <div style={{ display: "grid", gap: 14, maxWidth: 420 }}>
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="New password"
            style={field}
          />
          <input
            type="password"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            placeholder="Confirm new password"
            style={field}
          />
          {msg && <div style={{ fontSize: 13, color: V.tmut }}>{msg}</div>}
          <button
            onClick={submit}
            disabled={busy}
            style={{
              justifySelf: "start",
              background: V.sand,
              color: "#1c1303",
              border: 0,
              borderRadius: 12,
              padding: "12px 24px",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: ".06em",
              textTransform: "uppercase",
              cursor: busy ? "default" : "pointer",
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? "Saving…" : "Update password"}
          </button>
        </div>
      </div>

      <div style={{ background: V.card, border: `1px solid ${V.line}`, borderRadius: 20, padding: 26 }}>
        <div style={{ fontFamily: V.serif, fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Sessions</div>
        <p style={{ fontSize: 14, color: V.tmut, margin: "0 0 16px" }}>
          Signing out ends your session on this device.
        </p>
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = "/auth";
          }}
          style={{
            background: "transparent",
            border: `1px solid ${V.line}`,
            borderRadius: 12,
            padding: "11px 22px",
            fontSize: 13,
            fontWeight: 700,
            color: V.ink,
            cursor: "pointer",
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
