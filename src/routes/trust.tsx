import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicHeader } from "@/components/public/PublicHeader";


export const Route = createFileRoute("/trust")({
  component: TrustPage,
  head: () => ({
    meta: [
      { title: "Trust & Protection | Fish-X Charters" },
      {
        name: "description",
        content:
          "How Fish-X Charters protects your booking — escrow-secured payments, verified captains, and dispute support at every stage of the trip.",
      },
      { property: "og:title", content: "Trust & Protection | Fish-X Charters" },
      {
        property: "og:description",
        content:
          "Escrow-secured booking, verified captains, and neutral dispute resolution — the Fish-X trust framework.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const TOKENS: React.CSSProperties = {
  ["--serif" as never]: "'Cormorant Garamond',Georgia,serif",
  ["--sans" as never]: "'Hanken Grotesk',system-ui,sans-serif",
  ["--ink" as never]: "#0d2236",
  ["--navy" as never]: "#0a2236",
  ["--deep" as never]: "#06151f",
  ["--paper" as never]: "#f4f6f8",
  ["--paper2" as never]: "#e9edf1",
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

const ESCROW_STEPS = [
  {
    icon: "💳",
    title: "Secure Deposit",
    body:
      "Your payment is processed by our payment provider and held by Fish-X escrow — it never lands directly in the captain's account at booking.",
  },
  {
    icon: "🛡",
    title: "Protection Period",
    body:
      "Funds remain in escrow throughout the trip window. If something goes wrong before departure, you can raise it with Fish-X support.",
  },
  {
    icon: "✓",
    title: "Release After Trip",
    body:
      "Funds release to the captain automatically after the trip is marked completed, assuming no dispute has been opened within the review window.",
  },
];

const BENEFITS = [
  {
    tag: "The Standard",
    icon: "⚓",
    title: "Verified Captains",
    body:
      "Every Fish-X captain confirms their credentials and vessel details during onboarding before they can list a trip.",
  },
  {
    tag: "Flexibility",
    icon: "📅",
    title: "Weather Cancellations",
    body:
      "When the captain calls a weather cancellation, you can choose a full escrow refund or a free reschedule.",
  },
  {
    tag: "Security",
    icon: "🔒",
    title: "Encrypted Payments",
    body:
      "Card details are handled by our PCI-compliant payment provider over encrypted connections; Fish-X does not store raw card numbers.",
  },
  {
    tag: "Assistance",
    icon: "💬",
    title: "Concierge Support",
    body:
      "Message the Fish-X team from inside your booking any time you need help before, during or after the trip.",
  },
];

const FAQ = [
  {
    q: "What happens if the captain cancels my trip?",
    a: "If the captain cancels, you receive a full refund from escrow to your original payment method, and our concierge team will help you find a comparable vessel for your dates when possible.",
  },
  {
    q: "How long does a refund take to arrive?",
    a: "Once a refund is approved from escrow, funds typically return to your original payment method within a few business days — the exact timing depends on your bank or card issuer.",
  },
  {
    q: "How are disputes resolved?",
    a: "Fish-X acts as a neutral mediator. If you open a dispute within the review window, our team reviews the booking, in-app messages and any documentation both sides provide before releasing or refunding funds.",
  },
  {
    q: "Who can see my personal information?",
    a: "Your booking details are shared with the captain of the trip so they can host you safely. Fish-X staff access booking data only when needed to operate the platform or resolve a support request.",
  },
];

function TrustPage() {
  return (
    <div style={TOKENS}>
      <style>{`
        @keyframes tr-rise{0%{opacity:0;transform:translateY(20px)}100%{opacity:1;transform:translateY(0)}}
        .tr-rise{animation:tr-rise .8s both}
        .tr-card{background:var(--card);border:1px solid var(--line);border-radius:18px;transition:transform .3s ease,box-shadow .3s ease}
        .tr-card:hover{transform:translateY(-4px);box-shadow:0 24px 60px -30px rgba(10,34,54,.22)}
        details[data-tr]{background:var(--card);border-bottom:1px solid var(--line);padding:22px 4px;transition:background .2s ease}
        details[data-tr] summary{list-style:none;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:20px;font-family:var(--serif);font-size:20px;color:var(--ink);font-weight:600}
        details[data-tr] summary::-webkit-details-marker{display:none}
        details[data-tr] .tr-chev{width:28px;height:28px;border-radius:50%;background:var(--paper2);display:grid;place-items:center;transition:transform .3s ease;color:var(--goldtext);font-weight:700;flex:none}
        details[data-tr][open] .tr-chev{transform:rotate(45deg);background:var(--sand);color:var(--navy)}
        details[data-tr] .tr-body{margin-top:14px;color:var(--tmut);font-size:15.5px;line-height:1.65}
        .tr-escrow-line{position:absolute;top:44px;left:12%;right:12%;height:1px;background-image:repeating-linear-gradient(to right,var(--sand) 0,var(--sand) 8px,transparent 8px,transparent 16px);z-index:0}
        @media (max-width:820px){
          .tr-escrow{grid-template-columns:1fr !important;gap:40px !important}
          .tr-escrow-line{display:none}
          .tr-benefits{grid-template-columns:1fr !important}
          .tr-faq{grid-template-columns:1fr !important}
        }
        @media (min-width:821px) and (max-width:1080px){
          .tr-benefits{grid-template-columns:1fr 1fr !important}
        }
      `}</style>

      {/* ============ HEADER ============ */}
      <PublicHeader />


      {/* ============ HERO ============ */}
      <section
        style={{
          background:
            "radial-gradient(120% 90% at 50% 0%, #0e2c44 0%, #0a2236 46%, #081c2e 100%)",
          color: "var(--ond)",
          textAlign: "center",
          padding: "110px 40px 90px",
        }}
      >
        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          <div
            className="tr-rise"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              border: "1px solid var(--lined)",
              borderRadius: 40,
              padding: "8px 15px 8px 12px",
              marginBottom: 26,
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
                color: "var(--ondmut)",
              }}
            >
              Peace of Mind
            </span>
          </div>
          <h1
            className="tr-rise"
            style={{
              fontFamily: "var(--serif)",
              fontWeight: 600,
              fontSize: "clamp(44px,5.4vw,80px)",
              lineHeight: 1.05,
              letterSpacing: "-.02em",
              margin: "0 0 22px",
              color: "#fbfdff",
            }}
          >
            Book with total<br />
            <span style={{ fontStyle: "italic", color: "var(--sand)" }}>confidence.</span>
          </h1>
          <p
            className="tr-rise"
            style={{
              fontSize: 18,
              lineHeight: 1.6,
              color: "var(--ondmut)",
              maxWidth: 640,
              margin: "0 auto",
            }}
          >
            Every Fish-X booking is protected by an escrow-secured payment flow, verified captain profiles and a neutral dispute process &mdash; so you can focus on the fishing.
          </p>
        </div>
      </section>

      {/* ============ ESCROW STEPS ============ */}
      <section style={{ padding: "100px 40px", background: "var(--paper2)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 70 }}>
            <div style={eyebrow}>The Escrow Flow</div>
            <h2 style={h2Style}>How your payment stays protected</h2>
          </div>
          <div
            className="tr-escrow"
            style={{
              position: "relative",
              display: "grid",
              gridTemplateColumns: "repeat(3,1fr)",
              gap: 24,
            }}
          >
            <div className="tr-escrow-line" aria-hidden />
            {ESCROW_STEPS.map((s) => (
              <div
                key={s.title}
                style={{
                  position: "relative",
                  zIndex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  padding: "0 12px",
                }}
              >
                <div
                  style={{
                    width: 88,
                    height: 88,
                    borderRadius: "50%",
                    background: "var(--card)",
                    border: "1px solid var(--line)",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 34,
                    color: "var(--goldtext)",
                    boxShadow: "0 12px 40px -20px rgba(10,34,54,.25)",
                    marginBottom: 22,
                  }}
                >
                  {s.icon}
                </div>
                <h3
                  style={{
                    fontFamily: "var(--serif)",
                    fontSize: 24,
                    margin: "0 0 10px",
                    color: "var(--ink)",
                    fontWeight: 600,
                  }}
                >
                  {s.title}
                </h3>
                <p
                  style={{
                    fontSize: 15,
                    lineHeight: 1.6,
                    color: "var(--tmut)",
                    margin: 0,
                    maxWidth: 280,
                  }}
                >
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ BENEFITS GRID ============ */}
      <section style={{ padding: "100px 40px", background: "var(--paper)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <div style={eyebrow}>What you get</div>
            <h2 style={h2Style}>The Fish-X trust framework</h2>
          </div>
          <div
            className="tr-benefits"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              gap: 20,
            }}
          >
            {BENEFITS.map((b) => (
              <div key={b.title} className="tr-card" style={{ padding: 28 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 18,
                  }}
                >
                  <span style={{ color: "var(--goldtext)", fontSize: 22 }}>{b.icon}</span>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      letterSpacing: ".2em",
                      textTransform: "uppercase",
                      color: "var(--tmut)",
                    }}
                  >
                    {b.tag}
                  </span>
                </div>
                <h3
                  style={{
                    fontFamily: "var(--serif)",
                    fontSize: 22,
                    margin: "0 0 10px",
                    color: "var(--ink)",
                    fontWeight: 600,
                  }}
                >
                  {b.title}
                </h3>
                <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "var(--tmut)", margin: 0 }}>
                  {b.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section
        style={{
          padding: "100px 40px",
          background: "var(--paper)",
          borderTop: "1px solid var(--line)",
        }}
      >
        <div
          className="tr-faq"
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "1fr 2fr",
            gap: 60,
          }}
        >
          <div>
            <div style={eyebrow}>Refunds &amp; Disputes</div>
            <h2 style={{ ...h2Style, fontSize: "clamp(30px,3.2vw,44px)" }}>
              Transparency is the whole point.
            </h2>
            <p style={{ fontSize: 15.5, lineHeight: 1.6, color: "var(--tmut)", marginTop: 16 }}>
              How Fish-X handles the moments that don&rsquo;t go to plan.
            </p>
          </div>
          <div>
            {FAQ.map((f, i) => (
              <details key={f.q} data-tr open={i === 0}>
                <summary>
                  <span>{f.q}</span>
                  <span className="tr-chev">+</span>
                </summary>
                <div className="tr-body">{f.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section style={{ padding: "80px 40px 100px", background: "var(--paper)" }}>
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            borderRadius: 24,
            overflow: "hidden",
            background:
              "radial-gradient(120% 100% at 20% 0%, #0e2c44 0%, #0a2236 55%, #06151f 100%)",
            color: "var(--ond)",
            padding: "80px 40px",
            textAlign: "center",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -160,
              right: -120,
              width: 520,
              height: 520,
              background:
                "radial-gradient(circle, rgba(227,192,137,.18), rgba(227,192,137,0) 62%)",
              pointerEvents: "none",
            }}
          />
          <h2
            style={{
              fontFamily: "var(--serif)",
              fontWeight: 600,
              fontSize: "clamp(36px,4.4vw,60px)",
              lineHeight: 1.08,
              letterSpacing: "-.015em",
              margin: "0 0 18px",
              color: "#fbfdff",
              position: "relative",
            }}
          >
            Ready to <span style={{ fontStyle: "italic", color: "var(--sand)" }}>set sail?</span>
          </h2>
          <p
            style={{
              fontSize: 17,
              color: "var(--ondmut)",
              margin: "0 auto 32px",
              lineHeight: 1.6,
              maxWidth: 560,
              position: "relative",
            }}
          >
            Browse verified charters, hold your payment in escrow, and message your captain before you cast off.
          </p>
          <div style={{ position: "relative" }}>
            <Link to="/discover" style={{ ...ctaBtn, padding: "16px 32px", fontSize: 13 }}>
              Start exploring
            </Link>
          </div>
        </div>
      </section>

      {/* ============ QUALIFIER ============ */}
      <section style={{ padding: "40px 40px 60px", background: "var(--paper)" }}>
        <div
          style={{
            maxWidth: 900,
            margin: "0 auto",
            fontSize: 12.5,
            color: "var(--tmut)",
            lineHeight: 1.65,
            textAlign: "center",
            opacity: 0.85,
          }}
        >
          This page is maintained by Fish-X Charters to answer common questions about how bookings on Fish-X are protected. It describes app-visible controls we operate today and is not an independent certification, audit report, or legal guarantee. Payment processing, hosting and card handling are provided by third-party platforms under a shared-responsibility model, and captains remain responsible for the safe operation of their vessels.
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer style={{ background: "var(--deep)", color: "var(--ondmut)", padding: "50px 40px" }}>
        <div
          style={{
            maxWidth: 1200,
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
              The escrow-secured marketplace for the entire fishing industry.
            </p>
          </div>
          <div style={{ fontSize: 12.5 }}>
            <div style={{ marginBottom: 8 }}>&copy; 2026 Fish-X Charters. All rights reserved.</div>
            <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
              <a href="#" style={{ color: "var(--ondmut)", textDecoration: "none" }}>Privacy</a>
              <a href="#" style={{ color: "var(--ondmut)", textDecoration: "none" }}>Terms</a>
              <Link to="/trust" style={{ color: "var(--ondmut)", textDecoration: "none" }}>Trust</Link>
              <a href="#" style={{ color: "var(--ondmut)", textDecoration: "none" }}>Support</a>
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
