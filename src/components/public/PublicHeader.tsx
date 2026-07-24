import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const NAV = [
  { to: "/discover", label: "Charters" },
  { to: "/marketplace", label: "Marketplace" },
  { to: "/how-it-works", label: "How it works" },
  { to: "/trust", label: "Trust" },
  { to: "/brand-story", label: "Our story" },
  { to: "/become-a-captain", label: "For captains" },
] as const;

/**
 * Unified header used across all signed-out public pages.
 * Matches the landing (index) design so nav is consistent site-wide.
 */
export function PublicHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) =>
      setSignedIn(!!s),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  const navLink = (active: boolean): React.CSSProperties => ({
    color: "#eaf1f6",
    textDecoration: "none",
    fontFamily: "var(--sans)",
    fontSize: 14,
    fontWeight: active ? 700 : 500,
    letterSpacing: ".01em",
    opacity: active ? 1 : 0.9,
    borderBottom: active ? "1px solid var(--sand, #e3c089)" : "1px solid transparent",
    paddingBottom: 2,
    transition: "opacity .2s",
  });

  return (
    <header
      className="fx-public-header"
      data-open={open ? "true" : "false"}
      style={{
        position: "sticky",
        top: 0,
        zIndex: 60,
        background: "rgba(9,27,44,.94)",
        backdropFilter: "saturate(140%) blur(12px)",
        WebkitBackdropFilter: "saturate(140%) blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,.1)",
      }}
    >
      <style>{`
        .fx-public-header .fx-ph-toggle { display: none; }
        @media (max-width: 900px) {
          .fx-public-header .fx-ph-nav,
          .fx-public-header .fx-ph-actions { display: none !important; }
          .fx-public-header .fx-ph-toggle { display: inline-grid !important; }
          .fx-public-header[data-open="true"] .fx-ph-drawer { display: flex !important; }
        }
      `}</style>

      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
        }}
      >
        <Link
          to="/"
          style={{ display: "flex", alignItems: "center", gap: 11, textDecoration: "none", color: "#eaf1f6" }}
        >
          <span
            style={{
              width: 11,
              height: 11,
              background: "var(--sand, #e3c089)",
              transform: "rotate(45deg)",
              display: "inline-block",
              borderRadius: 1,
            }}
          />
          <span style={{ fontFamily: "var(--serif)", fontWeight: 600, fontSize: 21, letterSpacing: ".02em" }}>
            Fish-X Charters
          </span>
        </Link>

        <nav className="fx-ph-nav" style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} style={navLink(pathname.startsWith(n.to))}>
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="fx-ph-actions" style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {signedIn ? (
            <Link
              to="/dashboard"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "var(--sand, #e3c089)",
                color: "#1c1303",
                textDecoration: "none",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: ".1em",
                textTransform: "uppercase",
                padding: "12px 20px",
                borderRadius: 30,
              }}
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/auth"
                style={{ color: "#eaf1f6", textDecoration: "none", fontSize: 14, fontWeight: 600, opacity: 0.92 }}
              >
                Sign in
              </Link>
              <Link
                to="/discover"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "var(--sand, #e3c089)",
                  color: "#1c1303",
                  textDecoration: "none",
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: ".1em",
                  textTransform: "uppercase",
                  padding: "12px 20px",
                  borderRadius: 30,
                }}
              >
                Find a charter
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          aria-label="Menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="fx-ph-toggle"
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: "rgba(255,255,255,.08)",
            border: "1px solid rgba(255,255,255,.14)",
            color: "#eaf1f6",
            cursor: "pointer",
            placeItems: "center",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {/* Mobile drawer */}
      <div
        className="fx-ph-drawer"
        style={{
          display: "none",
          flexDirection: "column",
          gap: 4,
          padding: "8px 20px 20px",
          borderTop: "1px solid rgba(255,255,255,.08)",
        }}
      >
        {NAV.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            style={{
              color: "#eaf1f6",
              textDecoration: "none",
              fontFamily: "var(--sans)",
              fontSize: 15,
              fontWeight: 600,
              padding: "12px 6px",
              borderBottom: "1px solid rgba(255,255,255,.06)",
            }}
          >
            {n.label}
          </Link>
        ))}
        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          {signedIn ? (
            <Link
              to="/dashboard"
              style={{
                flex: 1,
                textAlign: "center",
                background: "var(--sand, #e3c089)",
                color: "#1c1303",
                textDecoration: "none",
                padding: "12px 16px",
                borderRadius: 30,
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: ".1em",
                textTransform: "uppercase",
              }}
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/auth"
                style={{
                  flex: 1,
                  textAlign: "center",
                  color: "#eaf1f6",
                  textDecoration: "none",
                  padding: "12px 16px",
                  border: "1px solid rgba(255,255,255,.18)",
                  borderRadius: 30,
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                Sign in
              </Link>
              <Link
                to="/discover"
                style={{
                  flex: 1,
                  textAlign: "center",
                  background: "var(--sand, #e3c089)",
                  color: "#1c1303",
                  textDecoration: "none",
                  padding: "12px 16px",
                  borderRadius: 30,
                  fontWeight: 700,
                  fontSize: 12,
                  letterSpacing: ".1em",
                  textTransform: "uppercase",
                }}
              >
                Find a charter
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
