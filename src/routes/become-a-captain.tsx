import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicHeader } from "@/components/public/PublicHeader";

import { useState } from "react";
import captainHero from "@/assets/captain-hero.jpg";

export const Route = createFileRoute("/become-a-captain")({
  component: BecomeCaptainPage,
  head: () => ({
    meta: [
      { title: "Become a Captain | Fish-X Charters" },
      {
        name: "description",
        content:
          "Join Fish-X Charters — the escrow-secured marketplace for elite charter captains. Set your prices, own your calendar, and get paid every week.",
      },
      { property: "og:title", content: "Become a Captain | Fish-X Charters" },
      {
        property: "og:description",
        content:
          "Turn your vessel into an investment. Reach discerning anglers, keep full control, and get paid securely.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const TOKENS: React.CSSProperties = {
  // shared palette from the landing page
  ["--serif" as never]: "'Cormorant Garamond',Georgia,serif",
  ["--sans" as never]: "'Hanken Grotesk',system-ui,sans-serif",
  ["--ink" as never]: "#0d2236",
  ["--navy" as never]: "#0a2236",
  ["--deep" as never]: "#06151f",
  ["--paper" as never]: "#f4f6f8",
  ["--card" as never]: "#ffffff",
  ["--sand" as never]: "#e3c089",
  ["--sand2" as never]: "#d2a566",
  ["--goldtext" as never]: "#b88c46",
  ["--cyan" as never]: "#27c0e2",
  ["--ond" as never]: "#eaf1f6",
  ["--ondmut" as never]: "#9bb0c0",
  ["--tmut" as never]: "#5c6b78",
  ["--line" as never]: "rgba(13,34,54,.10)",
  ["--lined" as never]: "rgba(255,255,255,.13)",
  background: "var(--paper)",
  color: "var(--ink)",
  fontFamily: "var(--sans)",
  overflowX: "hidden",
};

function BecomeCaptainPage() {
  const [trips, setTrips] = useState(8);
  const [price, setPrice] = useState(2500);
  const monthly = trips * price;

  return (
    <div style={TOKENS}>
      <style>{`
        @keyframes bc-rise{0%{opacity:0;transform:translateY(20px)}100%{opacity:1;transform:translateY(0)}}
        @keyframes bc-glow{0%,100%{opacity:.5}50%{opacity:.9}}
        .bc-rise{animation:bc-rise .8s both}
        .bc-card{background:var(--card);border:1px solid var(--line);border-radius:20px;transition:transform .3s ease, box-shadow .3s ease}
        .bc-card:hover{transform:translateY(-4px);box-shadow:0 24px 60px -30px rgba(10,34,54,.25)}
        .bc-slider{-webkit-appearance:none;appearance:none;width:100%;height:6px;background:linear-gradient(to right,var(--sand) 0%,var(--sand) var(--v,50%),#e6ebef var(--v,50%),#e6ebef 100%);border-radius:999px;outline:none}
        .bc-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:22px;height:22px;border-radius:50%;background:var(--navy);border:3px solid var(--sand);cursor:pointer;box-shadow:0 4px 12px rgba(10,34,54,.3)}
        .bc-slider::-moz-range-thumb{width:22px;height:22px;border-radius:50%;background:var(--navy);border:3px solid var(--sand);cursor:pointer}
        .bc-step-num{font-family:var(--serif);font-size:44px;line-height:1;color:var(--sand);font-weight:600}
        @media (max-width:820px){
          .bc-hero-grid{grid-template-columns:1fr !important}
          .bc-earn-grid{grid-template-columns:1fr !important}
          .bc-3col{grid-template-columns:1fr !important}
          .bc-4col{grid-template-columns:1fr 1fr !important}
        }
      `}</style>

      {/* ============ HEADER ============ */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 60,
          background: "rgba(9,27,44,.94)",
          backdropFilter: "saturate(140%) blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,.1)",
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            padding: "18px 40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 24,
          }}
        >
          <Link
            to="/"
            style={{ display: "flex", alignItems: "center", gap: 11, textDecoration: "none", color: "var(--ond)" }}
          >
            <span
              style={{
                width: 11,
                height: 11,
                background: "var(--sand)",
                transform: "rotate(45deg)",
                display: "inline-block",
                borderRadius: 1,
              }}
            />
            <span style={{ fontFamily: "var(--serif)", fontWeight: 600, fontSize: 21, letterSpacing: ".02em" }}>
              Fish-X Charters
            </span>
          </Link>
          <nav style={{ display: "flex", alignItems: "center", gap: 30 }}>
            <a href="#opportunity" style={navLink}>Opportunity</a>
            <a href="#earnings" style={navLink}>Earnings</a>
            <a href="#process" style={navLink}>Process</a>
            <a href="#trust" style={navLink}>Security</a>
          </nav>
          <a href="#apply" style={ctaBtn}>
            Join as Captain
          </a>
        </div>
      </header>

      {/* ============ HERO — full-bleed image ============ */}
      <section
        id="opportunity"
        style={{
          position: "relative",
          minHeight: "min(921px, 92vh)",
          display: "flex",
          alignItems: "center",
          overflow: "hidden",
          color: "var(--ond)",
        }}
      >
        <img
          src={captainHero}
          alt="Fish-X charter captain at dawn on a luxury vessel"
          width={1920}
          height={1280}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            zIndex: 0,
          }}
        />
        {/* gradient veil — deep hull left → transparent right */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            background:
              "linear-gradient(90deg, rgba(6,21,31,.85) 0%, rgba(10,34,54,.55) 40%, rgba(10,34,54,.15) 70%, rgba(10,34,54,0) 100%)",
          }}
        />
        {/* bottom fade into next section */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 140,
            zIndex: 1,
            background: "linear-gradient(180deg, rgba(244,246,248,0) 0%, var(--paper) 100%)",
          }}
        />
        {/* sand-gold glow accent */}
        <div
          style={{
            position: "absolute",
            top: -180,
            right: -140,
            width: 620,
            height: 620,
            background:
              "radial-gradient(circle, rgba(227,192,137,.22), rgba(227,192,137,0) 62%)",
            animation: "bc-glow 6s ease-in-out infinite",
            pointerEvents: "none",
            zIndex: 1,
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 2,
            width: "100%",
            maxWidth: 1280,
            margin: "0 auto",
            padding: "120px 40px",
          }}
        >
          <div style={{ maxWidth: 640 }}>
            <div
              className="bc-rise"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                border: "1px solid var(--lined)",
                borderRadius: 40,
                padding: "8px 15px 8px 12px",
                marginBottom: 26,
                background: "rgba(6,21,31,.35)",
                backdropFilter: "blur(6px)",
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "var(--cyan)",
                  boxShadow: "0 0 10px var(--cyan)",
                }}
              />
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  letterSpacing: ".22em",
                  textTransform: "uppercase",
                  color: "var(--ond)",
                  opacity: 0.9,
                }}
              >
                Exclusive Captain Partnership
              </span>
            </div>
            <h1
              className="bc-rise"
              style={{
                fontFamily: "var(--serif)",
                fontWeight: 600,
                fontSize: "clamp(48px,6vw,88px)",
                lineHeight: 1.02,
                letterSpacing: "-.02em",
                margin: "0 0 24px",
                color: "#fbfdff",
                textShadow: "0 2px 30px rgba(0,0,0,.35)",
              }}
            >
              Turn your vessel<br />
              into an <span style={{ fontStyle: "italic", color: "var(--sand)" }}>investment.</span>
            </h1>
            <p
              className="bc-rise"
              style={{
                fontSize: 19,
                lineHeight: 1.6,
                color: "rgba(234,241,246,.92)",
                maxWidth: 520,
                margin: "0 0 40px",
                textShadow: "0 1px 20px rgba(0,0,0,.3)",
              }}
            >
              Join the escrow-secured marketplace built for serious charter captains. Reach discerning anglers, keep full sovereignty over your calendar, and get paid every Tuesday.
            </p>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <a href="#apply" style={{ ...ctaBtn, padding: "16px 32px", fontSize: 13 }}>
                Start earning
              </a>
              <a
                href="#process"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  border: "1px solid rgba(255,255,255,.4)",
                  color: "var(--ond)",
                  textDecoration: "none",
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: ".1em",
                  textTransform: "uppercase",
                  padding: "16px 30px",
                  borderRadius: 30,
                  backdropFilter: "blur(6px)",
                  background: "rgba(255,255,255,.06)",
                }}
              >
                How it works
              </a>
            </div>
          </div>
        </div>
      </section>


      {/* ============ EARNINGS CALCULATOR ============ */}
      <section id="earnings" style={{ padding: "100px 40px", background: "var(--paper)" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <div style={eyebrow}>Profit Potential</div>
            <h2 style={h2Style}>Calculate your maritime revenue</h2>
          </div>
          <div
            className="bc-earn-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 1fr",
              gap: 40,
              alignItems: "stretch",
            }}
          >
            <div className="bc-card" style={{ padding: 40 }}>
              <div style={{ marginBottom: 32 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <label style={{ fontWeight: 600, color: "var(--ink)" }}>Expeditions per month</label>
                  <span style={{ fontFamily: "var(--serif)", fontSize: 22, color: "var(--goldtext)" }}>
                    {trips}
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={30}
                  value={trips}
                  onChange={(e) => setTrips(Number(e.target.value))}
                  className="bc-slider"
                  style={{ ["--v" as never]: `${((trips - 1) / 29) * 100}%` }}
                />
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <label style={{ fontWeight: 600, color: "var(--ink)" }}>Price per expedition</label>
                  <span style={{ fontFamily: "var(--serif)", fontSize: 22, color: "var(--goldtext)" }}>
                    ${price.toLocaleString()}
                  </span>
                </div>
                <input
                  type="range"
                  min={500}
                  max={10000}
                  step={100}
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="bc-slider"
                  style={{ ["--v" as never]: `${((price - 500) / 9500) * 100}%` }}
                />
              </div>
            </div>

            <div
              style={{
                background: "linear-gradient(135deg,#0a2236 0%,#0e2c44 100%)",
                color: "var(--ond)",
                borderRadius: 20,
                padding: 40,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 11.5,
                    fontWeight: 600,
                    letterSpacing: ".2em",
                    textTransform: "uppercase",
                    color: "var(--ondmut)",
                  }}
                >
                  Projected Monthly Earnings
                </div>
                <div
                  style={{
                    fontFamily: "var(--serif)",
                    fontSize: "clamp(48px,6vw,72px)",
                    fontWeight: 600,
                    color: "var(--sand)",
                    lineHeight: 1.05,
                    margin: "14px 0 12px",
                  }}
                >
                  ${monthly.toLocaleString()}
                </div>
                <p style={{ color: "var(--ondmut)", fontSize: 14, lineHeight: 1.5, margin: 0 }}>
                  Estimated based on median platform performance in your region. Escrow-released funds land in your account weekly.
                </p>
              </div>
              <a href="#apply" style={{ ...ctaBtn, marginTop: 28, alignSelf: "flex-start" }}>
                Apply to Join
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ============ VALUE PROPS ============ */}
      <section style={{ padding: "20px 40px 100px", background: "var(--paper)" }}>
        <div
          className="bc-3col"
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: 24,
          }}
        >
          {[
            {
              icon: "🛡",
              title: "Guaranteed Payouts",
              body: "Our secure escrow system ensures your revenue is protected and released immediately after each voyage.",
            },
            {
              icon: "⚙",
              title: "Absolute Control",
              body: "Full sovereignty over your price points, availability calendar, and guest vetting criteria.",
            },
            {
              icon: "📈",
              title: "Real-time Insights",
              body: "Sophisticated data visualization on seasonal trends, booking velocities, and market positioning.",
            },
          ].map((f) => (
            <div key={f.title} className="bc-card" style={{ padding: 32 }}>
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 12,
                  background: "linear-gradient(135deg,var(--sand),var(--sand2))",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 22,
                  marginBottom: 18,
                }}
              >
                {f.icon}
              </div>
              <h3 style={{ fontFamily: "var(--serif)", fontSize: 24, margin: "0 0 8px", color: "var(--ink)" }}>
                {f.title}
              </h3>
              <p style={{ color: "var(--tmut)", fontSize: 15, lineHeight: 1.6, margin: 0 }}>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============ PROCESS ============ */}
      <section
        id="process"
        style={{
          padding: "100px 40px",
          background: "linear-gradient(180deg,#f4f6f8 0%,#e9edf1 100%)",
        }}
      >
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <div style={eyebrow}>Onboarding</div>
            <h2 style={h2Style}>Your journey to a certified Fish-X Captain</h2>
          </div>
          <div
            className="bc-4col"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              gap: 24,
            }}
          >
            {[
              { n: "01", t: "Create profile", b: "Upload vessel documentation, certifications, and high-resolution media of your craft." },
              { n: "02", t: "Safety inspection", b: "A brief virtual or in-person review to ensure Fish-X safety and quality standards." },
              { n: "03", t: "Receive bookings", b: "Our concierge matches your vessel with discerning anglers seeking your specific profile." },
              { n: "04", t: "Weekly payouts", b: "Escrow funds are released to your account every Tuesday for all completed voyages." },
            ].map((s) => (
              <div key={s.n} className="bc-card" style={{ padding: 28 }}>
                <div className="bc-step-num">{s.n}</div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: ".2em",
                    textTransform: "uppercase",
                    color: "var(--goldtext)",
                    margin: "16px 0 6px",
                  }}
                >
                  Step {parseInt(s.n)}
                </div>
                <h3 style={{ fontFamily: "var(--serif)", fontSize: 22, margin: "0 0 10px", color: "var(--ink)" }}>
                  {s.t}
                </h3>
                <p style={{ color: "var(--tmut)", fontSize: 14.5, lineHeight: 1.6, margin: 0 }}>{s.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ TESTIMONIALS ============ */}
      <section style={{ padding: "100px 40px", background: "var(--paper)" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <div style={eyebrow}>Voices from the fleet</div>
            <h2 style={h2Style}>Captains earning with Fish-X</h2>
          </div>
          <div
            className="bc-3col"
            style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24 }}
          >
            {[
              { q: "The caliber of clientele on Fish-X is incomparable. It's transformed how I manage my charter operations.", n: "Capt. Julian Vane", p: "Port of Monaco", r: "$420k Revenue to date" },
              { q: "Fish-X gave me the data to realize I was underpricing my sunrise cruises. My revenue is up 35% in one season.", n: "Capt. Elena Rossi", p: "Amalfi Coast", r: "$285k Revenue to date" },
              { q: "The insurance disclosure and safety standards provide the peace of mind needed when hosting serious anglers.", n: "Capt. Soren Lund", p: "Copenhagen", r: "$190k Revenue to date" },
            ].map((t) => (
              <div key={t.n} className="bc-card" style={{ padding: 32, display: "flex", flexDirection: "column" }}>
                <div style={{ color: "var(--sand)", fontSize: 16, letterSpacing: 2, marginBottom: 14 }}>
                  ★★★★★
                </div>
                <p
                  style={{
                    fontFamily: "var(--serif)",
                    fontStyle: "italic",
                    fontSize: 19,
                    lineHeight: 1.5,
                    color: "var(--ink)",
                    margin: "0 0 24px",
                    flex: 1,
                  }}
                >
                  &ldquo;{t.q}&rdquo;
                </p>
                <div style={{ borderTop: "1px solid var(--line)", paddingTop: 16 }}>
                  <div style={{ fontWeight: 700, color: "var(--ink)" }}>{t.n}</div>
                  <div style={{ fontSize: 13, color: "var(--tmut)", margin: "2px 0 6px" }}>{t.p}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--goldtext)", letterSpacing: ".05em" }}>
                    {t.r}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ TRUST STRIP ============ */}
      <section id="trust" style={{ padding: "60px 40px", background: "var(--navy)", color: "var(--ond)" }}>
        <div
          className="bc-4col"
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(4,1fr)",
            gap: 24,
            textAlign: "center",
          }}
        >
          {[
            ["✓", "Verified Captain Network"],
            ["₤", "100% Payment Protection"],
            ["☎", "24/7 Concierge Support"],
            ["◈", "Global Maritime Compliance"],
          ].map(([i, t]) => (
            <div key={t} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <div style={{ color: "var(--sand)", fontSize: 26 }}>{i}</div>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{t}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section
        id="apply"
        style={{
          padding: "110px 40px",
          background:
            "radial-gradient(120% 90% at 50% 0%, #0e2c44 0%, #0a2236 60%, #06151f 100%)",
          color: "var(--ond)",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 780, margin: "0 auto" }}>
          <h2
            style={{
              fontFamily: "var(--serif)",
              fontWeight: 600,
              fontSize: "clamp(38px,4.6vw,64px)",
              lineHeight: 1.08,
              letterSpacing: "-.015em",
              margin: "0 0 20px",
              color: "#fbfdff",
            }}
          >
            The ocean is waiting for <span style={{ fontStyle: "italic", color: "var(--sand)" }}>your command.</span>
          </h2>
          <p style={{ fontSize: 17, color: "var(--ondmut)", margin: "0 0 34px", lineHeight: 1.6 }}>
            Applications are reviewed within 48 hours. Start your journey into the escrow-secured maritime economy today.
          </p>
          <Link to="/auth" style={{ ...ctaBtn, padding: "16px 32px", fontSize: 13 }}>
            Join as Captain
          </Link>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer style={{ background: "var(--deep)", color: "var(--ondmut)", padding: "50px 40px" }}>
        <div
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            gap: 30,
            flexWrap: "wrap",
          }}
        >
          <div style={{ maxWidth: 380 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  background: "var(--sand)",
                  transform: "rotate(45deg)",
                  display: "inline-block",
                }}
              />
              <span style={{ fontFamily: "var(--serif)", fontSize: 20, color: "var(--ond)", fontWeight: 600 }}>
                Fish-X Charters
              </span>
            </div>
            <p style={{ fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>
              The escrow-secured marketplace for the entire fishing industry &mdash; connecting captains, guides, marinas and gear brands with discerning anglers.
            </p>
          </div>
          <div style={{ fontSize: 12.5 }}>
            <div style={{ marginBottom: 8 }}>&copy; 2026 Fish-X Charters. All rights reserved.</div>
            <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
              <a href="#" style={footLink}>Privacy</a>
              <a href="#" style={footLink}>Terms</a>
              <a href="#" style={footLink}>Insurance</a>
              <a href="#" style={footLink}>Safety</a>
              <a href="#" style={footLink}>Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

const navLink: React.CSSProperties = {
  color: "var(--ond)",
  textDecoration: "none",
  fontSize: 14,
  fontWeight: 500,
  opacity: 0.92,
};

const ctaBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  background: "var(--sand)",
  color: "#1c1303",
  textDecoration: "none",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: ".1em",
  textTransform: "uppercase",
  padding: "12px 20px",
  borderRadius: 30,
  border: "none",
  cursor: "pointer",
};

const eyebrow: React.CSSProperties = {
  fontSize: 11.5,
  fontWeight: 700,
  letterSpacing: ".24em",
  textTransform: "uppercase",
  color: "var(--goldtext)",
  marginBottom: 12,
};

const h2Style: React.CSSProperties = {
  fontFamily: "var(--serif)",
  fontWeight: 600,
  fontSize: "clamp(34px,3.6vw,52px)",
  lineHeight: 1.1,
  letterSpacing: "-.01em",
  margin: 0,
  color: "var(--ink)",
};

const footLink: React.CSSProperties = {
  color: "var(--ondmut)",
  textDecoration: "none",
};
