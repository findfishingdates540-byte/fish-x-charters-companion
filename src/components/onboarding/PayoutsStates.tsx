/**
 * Captain Onboarding — Payouts verification states.
 * Visual-only port of the three Stitch "Charter Box Zone 1" screens:
 *   - verifying : "Verifying your details" (spinner + status steps)
 *   - verified  : "Payouts enabled" (success card)
 *   - action    : "Stripe needs a bit more information" (action-needed card)
 *
 * These render the shared Captain Onboarding shell (top bar + side nav +
 * mobile bottom nav) with the Payouts step active. State is switchable via the
 * `state` prop (driven by the ?state search param); there is no live payout
 * provider wired yet — a preview switcher lets you flip between the three.
 *
 * Palette/typography mirror the Stitch Material tokens (primary bronze #715b3b,
 * sandy-gold primary-container #e4c7a0, cyan tertiary-container #39def9,
 * Source Serif 4 headlines + Hanken Grotesk body). Icons use the Material
 * Symbols Outlined webfont loaded by the route head.
 */
import { useState } from "react";

export type PayoutState = "verifying" | "verified" | "action";

const V = {
  serif: "'Source Serif 4',Georgia,serif",
  sans: "'Hanken Grotesk',system-ui,sans-serif",
  bg: "#f7f9fc", // surface-bright
  white: "#ffffff",
  primary: "#715b3b",
  primaryContainer: "#e4c7a0",
  onPrimaryContainer: "#675233",
  onSurface: "#191c1e",
  onSurfaceVariant: "#4d463c",
  outlineVariant: "#d0c5b8",
  containerLow: "#f2f4f7", // surface-container-low
  containerHigh: "#e6e8eb", // surface-container-high
  tertiary: "#006877",
  tertiaryContainer: "#39def9",
};

type NavItem = { icon: string; label: string };
const NAV: NavItem[] = [
  { icon: "person", label: "Account" },
  { icon: "business_center", label: "Business Profile" },
  { icon: "payments", label: "Payouts" },
  { icon: "directions_boat", label: "Listing" },
  { icon: "rocket_launch", label: "Go Live" },
];
const MOBILE_NAV: NavItem[] = [
  { icon: "person", label: "Account" },
  { icon: "business_center", label: "Business" },
  { icon: "payments", label: "Payouts" },
  { icon: "directions_boat", label: "Listing" },
  { icon: "rocket_launch", label: "Live" },
];

function Icon({
  name,
  fill,
  style,
}: {
  name: string;
  fill?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className="material-symbols-outlined"
      style={{ fontVariationSettings: fill ? "'FILL' 1" : undefined, ...style }}
    >
      {name}
    </span>
  );
}

/** Scoped animations + Material Symbols base class (self-contained). */
function StyleTag() {
  return (
    <style>{`
      .material-symbols-outlined {
        font-family: 'Material Symbols Outlined';
        font-weight: normal; font-style: normal; line-height: 1;
        letter-spacing: normal; text-transform: none; display: inline-block;
        white-space: nowrap; word-wrap: normal; direction: ltr;
        font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24;
        -webkit-font-feature-settings: 'liga'; -webkit-font-smoothing: antialiased;
      }
      @keyframes fx-rotate { from { transform: rotate(0); } to { transform: rotate(360deg); } }
      @keyframes fx-shimmer { from { background-position: -200% 0; } to { background-position: 200% 0; } }
      @keyframes fx-ping { 75%,100% { transform: scale(2); opacity: 0; } }
      @keyframes fx-rise { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      .fx-spin { animation: fx-rotate 8s linear infinite; }
      .fx-shimmer {
        background: linear-gradient(90deg, transparent, rgba(57,222,249,.2), transparent);
        background-size: 200% 100%; animation: fx-shimmer 2s infinite linear;
      }
      .fx-ping { animation: fx-ping 1.4s cubic-bezier(0,0,.2,1) infinite; }
      .fx-rise { animation: fx-rise .7s cubic-bezier(.16,1,.3,1) both; }
    `}</style>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: V.bg,
        color: V.onSurface,
        fontFamily: V.sans,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* TopAppBar */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          height: 80,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 clamp(20px,5vw,64px)",
          background: "rgba(247,249,252,.8)",
          backdropFilter: "blur(20px)",
          borderBottom: `1px solid ${V.outlineVariant}55`,
          boxShadow: "0 1px 2px rgba(0,0,0,.04)",
        }}
      >
        <span
          style={{ fontFamily: V.serif, fontSize: 24, fontWeight: 700, color: V.primary }}
        >
          Captain Onboarding
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: ".1em",
              textTransform: "uppercase",
              color: V.onSurfaceVariant,
              cursor: "pointer",
            }}
          >
            Save Progress
          </span>
          <Icon name="help_outline" style={{ color: V.primary, cursor: "pointer" }} />
        </div>
      </header>

      <div style={{ display: "flex", flex: 1 }}>
        {/* SideNavBar (desktop) */}
        <aside
          className="pay-sidenav"
          style={{
            width: 288,
            flexShrink: 0,
            position: "sticky",
            top: 80,
            height: "calc(100vh - 80px)",
            background: V.containerLow,
            borderRight: `1px solid ${V.outlineVariant}33`,
            padding: "32px 24px",
            boxSizing: "border-box",
          }}
        >
          <div style={{ marginBottom: 40 }}>
            <h2 style={{ fontFamily: V.serif, fontSize: 24, color: V.primary, margin: "0 0 4px" }}>
              Onboarding Progress
            </h2>
            <p style={{ fontSize: 14, color: `${V.onSurfaceVariant}b3`, margin: 0 }}>
              Complete your profile to start hosting
            </p>
          </div>
          <nav style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {NAV.map((n) => {
              const active = n.label === "Payouts";
              return (
                <div
                  key={n.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    padding: 16,
                    borderRadius: 12,
                    cursor: active ? "default" : "pointer",
                    background: active ? V.primaryContainer : "transparent",
                    color: active ? V.onPrimaryContainer : V.onSurfaceVariant,
                    boxShadow: active ? "0 0 15px rgba(57,222,249,.3)" : undefined,
                    transform: active ? "scale(.99)" : undefined,
                  }}
                >
                  <Icon name={n.icon} fill={active} />
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{n.label}</span>
                </div>
              );
            })}
          </nav>
        </aside>

        {/* Main */}
        <main
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "clamp(20px,5vw,64px)",
            position: "relative",
            overflow: "hidden",
            background:
              "radial-gradient(circle at 50% -20%, #e0f2fe 0%, #f7f9fc 60%)",
          }}
        >
          {/* Atmospheric blobs */}
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.3 }}>
            <div
              style={{
                position: "absolute",
                top: "-10%",
                right: "-10%",
                width: 600,
                height: 600,
                background: `${V.tertiaryContainer}1a`,
                filter: "blur(120px)",
                borderRadius: "50%",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: "-10%",
                left: "-10%",
                width: 500,
                height: 500,
                background: `${V.primaryContainer}1a`,
                filter: "blur(100px)",
                borderRadius: "50%",
              }}
            />
          </div>
          {children}
        </main>
      </div>

      {/* BottomNavBar (mobile) */}
      <nav
        className="pay-bottomnav"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          width: "100%",
          zIndex: 50,
          display: "flex",
          justifyContent: "space-around",
          alignItems: "center",
          padding: "12px 16px",
          background: "rgba(247,249,252,.9)",
          backdropFilter: "blur(12px)",
          borderTop: `1px solid ${V.outlineVariant}4d`,
          borderRadius: "12px 12px 0 0",
          boxShadow: "0 -4px 20px rgba(0,0,0,.05)",
        }}
      >
        {MOBILE_NAV.map((n) => {
          const active = n.label === "Payouts";
          return (
            <div
              key={n.label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                color: active ? V.primary : V.onSurfaceVariant,
                fontWeight: active ? 700 : 400,
                transform: active ? "scale(.95)" : undefined,
              }}
            >
              <Icon name={n.icon} fill={active} />
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em" }}>
                {n.label}
              </span>
            </div>
          );
        })}
      </nav>
    </div>
  );
}

const cardBase: React.CSSProperties = {
  position: "relative",
  zIndex: 10,
  width: "100%",
  background: V.white,
  borderRadius: 16,
  border: `1px solid ${V.outlineVariant}4d`,
  boxShadow: "0 10px 30px rgba(10,26,47,.06)",
  boxSizing: "border-box",
};

function VerifyingCard() {
  const steps = [
    { label: "Identity Information Provided", done: true },
    { label: "Bank Account Connected", done: true },
    { label: "Validating Merchant Status…", done: false },
  ];
  return (
    <section
      style={{
        ...cardBase,
        maxWidth: 672,
        padding: "clamp(28px,4vw,48px)",
        textAlign: "center",
        overflow: "hidden",
      }}
    >
      {/* Cyan progress indicator */}
      <div style={{ position: "relative", width: 128, height: 128, margin: "0 auto 40px" }}>
        <svg className="fx-spin" viewBox="0 0 100 100" style={{ width: "100%", height: "100%" }}>
          <circle cx="50" cy="50" r="45" fill="transparent" stroke={V.containerHigh} strokeWidth="2" />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="transparent"
            stroke={V.tertiaryContainer}
            strokeWidth="3"
            strokeDasharray="100 180"
            strokeLinecap="round"
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon
            name="verified_user"
            fill
            style={{ fontSize: 40, color: V.tertiaryContainer }}
          />
        </div>
      </div>

      <h1 style={{ fontFamily: V.serif, fontSize: 32, color: V.onSurface, margin: "0 0 16px" }}>
        Verifying your details
      </h1>
      <p
        style={{
          fontSize: 18,
          lineHeight: "28px",
          color: `${V.onSurfaceVariant}cc`,
          margin: "0 0 48px",
        }}
      >
        This can take a few minutes. We're finalizing the connection with your banking provider to
        ensure seamless payouts for your future charters.
      </p>

      {/* Status steps */}
      <div style={{ maxWidth: 340, margin: "0 auto", display: "grid", gap: 16 }}>
        {steps.map((s) => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 12, textAlign: "left" }}>
            {s.done ? (
              <Icon name="check_circle" style={{ fontSize: 20, color: V.tertiary }} />
            ) : (
              <span
                style={{
                  width: 20,
                  height: 20,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                }}
              >
                <span
                  className="fx-ping"
                  style={{
                    position: "absolute",
                    inset: 0,
                    border: `2px solid ${V.tertiaryContainer}`,
                    borderRadius: "50%",
                    opacity: 0.3,
                  }}
                />
                <span
                  style={{ width: 8, height: 8, background: V.tertiary, borderRadius: "50%" }}
                />
              </span>
            )}
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: s.done ? V.onSurfaceVariant : V.onSurface,
              }}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 64, paddingTop: 32, borderTop: `1px solid ${V.outlineVariant}33` }}>
        <button
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            margin: "0 auto",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: V.onSurfaceVariant,
            fontFamily: V.sans,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          <Icon name="arrow_back" style={{ fontSize: 16 }} />
          Back to Dashboard
        </button>
      </div>

      {/* Shimmer overlay */}
      <div
        className="fx-shimmer"
        style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.1 }}
      />
    </section>
  );
}

function VerifiedCard() {
  return (
    <div
      className="fx-rise"
      style={{
        ...cardBase,
        maxWidth: 576,
        padding: "clamp(28px,4vw,48px)",
        textAlign: "center",
        background: "rgba(255,255,255,.8)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(226,232,240,.5)",
        boxShadow: "0 25px 50px -12px rgba(0,0,0,.25)",
      }}
    >
      {/* Checkmark with glow */}
      <div style={{ marginBottom: 40, display: "inline-flex" }}>
        <div style={{ position: "relative" }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: V.primaryContainer,
              filter: "blur(32px)",
              opacity: 0.4,
              borderRadius: "50%",
              transform: "scale(1.5)",
            }}
          />
          <div
            style={{
              position: "relative",
              width: 96,
              height: 96,
              borderRadius: "50%",
              background: V.primaryContainer,
              color: V.primary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 15px rgba(57,222,249,.5), 0 0 0 4px #fff",
            }}
          >
            <Icon name="check_circle" fill style={{ fontSize: 48 }} />
          </div>
        </div>
      </div>

      <h1 style={{ fontFamily: V.serif, fontSize: 32, color: V.onSurface, margin: "0 0 16px" }}>
        Payouts enabled
      </h1>
      <p
        style={{
          fontSize: 18,
          lineHeight: "28px",
          color: V.onSurfaceVariant,
          margin: "0 auto 48px",
          maxWidth: 340,
        }}
      >
        Your banking information has been successfully verified. You're ready to get paid for your
        expeditions.
      </p>

      <button
        style={{
          width: "100%",
          background: V.primaryContainer,
          color: V.onPrimaryContainer,
          fontFamily: V.sans,
          fontSize: 18,
          fontWeight: 600,
          padding: "20px 32px",
          borderRadius: 12,
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          boxShadow: "0 10px 15px -3px rgba(0,0,0,.1), 0 0 20px rgba(57,222,249,.3)",
        }}
      >
        Continue to Listing
        <Icon name="arrow_forward" />
      </button>

      <div
        style={{
          marginTop: 32,
          paddingTop: 32,
          borderTop: `1px solid ${V.outlineVariant}4d`,
          display: "flex",
          justifyContent: "center",
          gap: 32,
        }}
      >
        {[
          { icon: "verified", label: "Verified" },
          { icon: "lock", label: "Secure" },
        ].map((b) => (
          <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name={b.icon} fill style={{ fontSize: 14, color: V.primary }} />
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: ".1em",
                textTransform: "uppercase",
                color: V.onSurfaceVariant,
              }}
            >
              {b.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActionNeededCard() {
  const perks = [
    { icon: "speed", label: "Next-Day Payouts" },
    { icon: "account_balance", label: "Direct Deposit" },
    { icon: "policy", label: "Compliant & Safe" },
  ];
  return (
    <section className="fx-rise" style={{ maxWidth: 800, width: "100%" }}>
      <div
        style={{
          ...cardBase,
          padding: "clamp(32px,6vw,80px)",
          border: `1px solid ${V.outlineVariant}`,
          overflow: "hidden",
        }}
      >
        {/* Amber highlight */}
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: 256,
            height: 256,
            background: `${V.primaryContainer}1a`,
            filter: "blur(80px)",
            marginRight: -128,
            marginTop: -128,
            borderRadius: "50%",
          }}
        />
        <div
          style={{
            position: "relative",
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              background: `${V.primaryContainer}33`,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 32,
            }}
          >
            <Icon name="verified_user" fill style={{ fontSize: 36, color: V.primary }} />
          </div>

          <h1 style={{ fontFamily: V.serif, fontSize: 32, color: V.onSurface, margin: "0 0 16px" }}>
            Stripe needs a bit more information
          </h1>
          <p
            style={{
              fontSize: 18,
              lineHeight: "28px",
              color: V.onSurfaceVariant,
              maxWidth: 512,
              margin: "0 0 48px",
            }}
          >
            To ensure secure and rapid payouts to your account, our payment processor requires a few
            additional details regarding your maritime business.
          </p>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, width: "100%" }}>
            <button
              style={{
                padding: "20px 40px",
                background: V.primaryContainer,
                color: V.onPrimaryContainer,
                fontFamily: V.sans,
                fontSize: 18,
                fontWeight: 600,
                borderRadius: 9999,
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                boxShadow: "0 0 15px rgba(57,222,249,.35)",
              }}
            >
              Finish verification
              <Icon name="arrow_forward" style={{ fontSize: 20 }} />
            </button>
            <p
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: ".1em",
                textTransform: "uppercase",
                color: V.onSurfaceVariant,
                margin: 0,
              }}
            >
              <Icon name="lock" style={{ fontSize: 14 }} />
              Secure 256-bit encrypted verification
            </p>
          </div>

          <div
            style={{
              marginTop: 64,
              paddingTop: 48,
              borderTop: `1px solid ${V.outlineVariant}4d`,
              display: "grid",
              gridTemplateColumns: "repeat(3,1fr)",
              gap: 32,
              width: "100%",
            }}
          >
            {perks.map((p) => (
              <div
                key={p.label}
                style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
              >
                <Icon name={p.icon} style={{ color: V.primaryContainer, marginBottom: 8 }} />
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: ".1em",
                    textTransform: "uppercase",
                    color: V.onSurfaceVariant,
                  }}
                >
                  {p.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p
        style={{
          textAlign: "center",
          marginTop: 32,
          fontSize: 16,
          fontStyle: "italic",
          color: `${V.onSurfaceVariant}b3`,
        }}
      >
        Having trouble?{" "}
        <a href="#" style={{ color: V.primary, fontWeight: 600 }}>
          Contact our captain concierge
        </a>
      </p>
    </section>
  );
}

const SWITCHER: { key: PayoutState; label: string }[] = [
  { key: "verifying", label: "Verifying" },
  { key: "verified", label: "Verified" },
  { key: "action", label: "Action needed" },
];

/** Preview-only control to flip between the three payout states. */
function PreviewSwitcher({
  value,
  onChange,
}: {
  value: PayoutState;
  onChange: (s: PayoutState) => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 60,
        display: "flex",
        gap: 4,
        padding: 4,
        borderRadius: 9999,
        background: "rgba(255,255,255,.9)",
        backdropFilter: "blur(12px)",
        border: `1px solid ${V.outlineVariant}66`,
        boxShadow: "0 8px 24px rgba(10,26,47,.12)",
        fontFamily: V.sans,
      }}
    >
      {SWITCHER.map((s) => {
        const active = s.key === value;
        return (
          <button
            key={s.key}
            onClick={() => onChange(s.key)}
            style={{
              padding: "8px 14px",
              borderRadius: 9999,
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              background: active ? V.primaryContainer : "transparent",
              color: active ? V.onPrimaryContainer : V.onSurfaceVariant,
            }}
          >
            {s.label}
          </button>
        );
      })}
    </div>
  );
}

export function PayoutsStates({ state = "verifying" }: { state?: PayoutState }) {
  const [current, setCurrent] = useState<PayoutState>(state);
  return (
    <>
      <StyleTag />
      <Shell>
        {current === "verifying" && <VerifyingCard />}
        {current === "verified" && <VerifiedCard />}
        {current === "action" && <ActionNeededCard />}
      </Shell>
      <PreviewSwitcher value={current} onChange={setCurrent} />
      <style>{`
        @media (max-width: 1023px) {
          .pay-sidenav { display: none !important; }
        }
        @media (min-width: 1024px) {
          .pay-bottomnav { display: none !important; }
        }
      `}</style>
    </>
  );
}
