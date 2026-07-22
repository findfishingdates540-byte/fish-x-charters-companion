/**
 * Shared shell for operator dashboards (marina, tackle, gear, apparel, guide).
 * Provides sidebar + top bar + page frame in the Fish-X design system.
 */
import { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { signOut } from "@/lib/auth.functions";

export interface OperatorNavItem {
  key: string;
  label: string;
  badge?: number | string;
  icon: ReactNode;
}

export function OperatorShell({
  workspaceName,
  workspaceKind,
  operatorName,
  operatorRole,
  nav,
  active,
  onNav,
  pageTitle,
  pageSub,
  headerRight,
  children,
}: {
  workspaceName: string;
  workspaceKind: string;
  operatorName: string;
  operatorRole: string;
  nav: OperatorNavItem[];
  active: string;
  onNav: (key: string) => void;
  pageTitle: string;
  pageSub?: string;
  headerRight?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#eef2f5",
        color: "#0d2236",
        fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
      }}
    >
      {/* SIDEBAR */}
      <aside
        style={{
          width: 256,
          flex: "none",
          background: "#0a2236",
          color: "#eaf1f6",
          display: "flex",
          flexDirection: "column",
          padding: "22px 16px",
          position: "sticky",
          top: 0,
          height: "100vh",
          borderRight: "1px solid rgba(255,255,255,.06)",
        }}
      >
        <Link
          to="/dashboard"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "6px 10px 22px",
            textDecoration: "none",
            color: "inherit",
          }}
        >
          <span
            style={{
              width: 11,
              height: 11,
              background: "#e3c089",
              transform: "rotate(45deg)",
              display: "inline-block",
              borderRadius: 1,
            }}
          />
          <span
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontWeight: 600,
              fontSize: 20,
              letterSpacing: ".1em",
            }}
          >
            FISH&mdash;X
          </span>
        </Link>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 11,
            background: "rgba(255,255,255,.05)",
            border: "1px solid rgba(255,255,255,.10)",
            borderRadius: 13,
            padding: "11px 12px",
            marginBottom: 18,
          }}
        >
          <span
            style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              background: "rgba(227,192,137,.16)",
              display: "grid",
              placeItems: "center",
              color: "#e3c089",
              flex: "none",
              fontWeight: 700,
            }}
          >
            {workspaceName.charAt(0)}
          </span>
          <div style={{ lineHeight: 1.2, minWidth: 0 }}>
            <div
              style={{
                fontSize: 9.5,
                fontWeight: 700,
                letterSpacing: ".14em",
                textTransform: "uppercase",
                color: "#93a7b7",
              }}
            >
              {workspaceKind}
            </div>
            <div
              style={{
                fontSize: 13.5,
                fontWeight: 600,
                color: "#fff",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {workspaceName}
            </div>
          </div>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {nav.map((n) => {
            const isActive = n.key === active;
            return (
              <button
                key={n.key}
                onClick={() => onNav(n.key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  width: "100%",
                  background: isActive ? "rgba(227,192,137,.14)" : "transparent",
                  border: 0,
                  borderRadius: 11,
                  padding: "11px 12px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 14,
                  fontWeight: 600,
                  color: isActive ? "#fff" : "#93a7b7",
                  textAlign: "left",
                }}
              >
                <span style={{ display: "inline-flex", color: isActive ? "#e3c089" : "inherit" }}>
                  {n.icon}
                </span>
                {n.label}
                {n.badge !== undefined && n.badge !== 0 && (
                  <span
                    style={{
                      marginLeft: "auto",
                      background: "#e3c089",
                      color: "#1c1303",
                      fontSize: 11,
                      fontWeight: 700,
                      borderRadius: 20,
                      padding: "1px 8px",
                    }}
                  >
                    {n.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div
          style={{
            marginTop: "auto",
            display: "flex",
            alignItems: "center",
            gap: 11,
            background: "rgba(255,255,255,.05)",
            border: "1px solid rgba(255,255,255,.10)",
            borderRadius: 13,
            padding: "10px 12px",
          }}
        >
          <span
            style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              background: "rgba(227,192,137,.18)",
              display: "grid",
              placeItems: "center",
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 16,
              fontWeight: 600,
              color: "#e3c089",
              flex: "none",
            }}
          >
            {operatorName.charAt(0)}
          </span>
          <div style={{ lineHeight: 1.25, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#fff",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {operatorName}
            </div>
            <div style={{ fontSize: 11, color: "#e3c089" }}>{operatorRole}</div>
          </div>
          <button
            title="Sign out"
            onClick={() => signOut()}
            style={{
              marginLeft: "auto",
              background: "transparent",
              border: 0,
              color: "#93a7b7",
              cursor: "pointer",
              flex: "none",
              padding: 4,
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
              <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H3" />
            </svg>
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 20,
            background: "rgba(238,242,245,.86)",
            backdropFilter: "saturate(140%) blur(12px)",
            WebkitBackdropFilter: "saturate(140%) blur(12px)",
            borderBottom: "1px solid rgba(13,34,54,.10)",
            padding: "18px 34px",
            display: "flex",
            alignItems: "center",
            gap: 24,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontWeight: 600,
                fontSize: 26,
                lineHeight: 1.1,
                color: "#0d2236",
              }}
            >
              {pageTitle}
            </div>
            {pageSub && (
              <div style={{ fontSize: 13, color: "#5c6b78", marginTop: 1 }}>{pageSub}</div>
            )}
          </div>
          {headerRight && (
            <div
              style={{
                marginLeft: "auto",
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              {headerRight}
            </div>
          )}
        </header>

        <main
          style={{
            flex: 1,
            padding: "30px 34px 48px",
            maxWidth: 1180,
            width: "100%",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

/* ============ Shared building blocks ============ */

export function KPICard({
  label,
  value,
  trend,
  trendPositive = true,
}: {
  label: string;
  value: string;
  trend?: string;
  trendPositive?: boolean;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid rgba(13,34,54,.10)",
        borderRadius: 18,
        padding: 20,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: ".1em",
            textTransform: "uppercase",
            color: "#5c6b78",
          }}
        >
          {label}
        </span>
        {trend && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: trendPositive ? "#1f8a5b" : "#d8514a",
              background: trendPositive ? "#e2f2ea" : "#fbe9e8",
              borderRadius: 20,
              padding: "2px 8px",
            }}
          >
            {trend}
          </span>
        )}
      </div>
      <div
        style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontWeight: 600,
          fontSize: 34,
          lineHeight: 1,
          color: "#0d2236",
        }}
      >
        {value}
      </div>
    </div>
  );
}

export function Card({
  title,
  eyebrow,
  right,
  children,
}: {
  title?: string;
  eyebrow?: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid rgba(13,34,54,.10)",
        borderRadius: 20,
        padding: 24,
      }}
    >
      {(title || eyebrow || right) && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 18,
            gap: 12,
          }}
        >
          <div>
            {eyebrow && (
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: ".14em",
                  textTransform: "uppercase",
                  color: "#a97e3c",
                }}
              >
                {eyebrow}
              </div>
            )}
            {title && (
              <div
                style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontWeight: 600,
                  fontSize: 22,
                  color: "#0d2236",
                  marginTop: eyebrow ? 3 : 0,
                }}
              >
                {title}
              </div>
            )}
          </div>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

export function StatusPill({
  label,
  tone = "muted",
}: {
  label: string;
  tone?: "muted" | "green" | "gold" | "cyan" | "red" | "navy";
}) {
  const tones: Record<string, { bg: string; fg: string }> = {
    muted: { bg: "#eef2f5", fg: "#5c6b78" },
    green: { bg: "#e2f2ea", fg: "#1f8a5b" },
    gold: { bg: "#f4e6cd", fg: "#a97e3c" },
    cyan: { bg: "#e2eef2", fg: "#1f9fbe" },
    red: { bg: "#fbe9e8", fg: "#d8514a" },
    navy: { bg: "#0a2236", fg: "#fff" },
  };
  const t = tones[tone];
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        borderRadius: 20,
        padding: "4px 11px",
        whiteSpace: "nowrap",
        color: t.fg,
        background: t.bg,
      }}
    >
      {label}
    </span>
  );
}

export function money(cents: number | null | undefined) {
  const v = ((cents ?? 0) / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
  return v;
}
