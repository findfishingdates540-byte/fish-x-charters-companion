import { createFileRoute, Link } from "@tanstack/react-router";
import discoverImg from "@/assets/hiw-discover.jpg";
import bookImg from "@/assets/hiw-book.jpg";
import coordinateImg from "@/assets/hiw-coordinate.jpg";
import experienceImg from "@/assets/hiw-experience.jpg";
import ctaBg from "@/assets/hiw-cta-bg.jpg";

export const Route = createFileRoute("/how-it-works")({
  component: HowItWorksPage,
  head: () => ({
    meta: [
      { title: "How It Works | Fish-X Charters" },
      {
        name: "description",
        content:
          "Discover, book, coordinate and experience — Fish-X makes charter fishing simple, with escrow-secured payments and 24/7 concierge support.",
      },
      { property: "og:title", content: "How It Works | Fish-X Charters" },
      {
        property: "og:description",
        content:
          "Escrow-secured charter booking, from discovery to dockside — the Fish-X way.",
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

const STEPS = [
  {
    n: "01",
    title: "Discover",
    body:
      "Explore our fleet of elite, verified vessels. From shallow-water skiffs to offshore battlewagons, every captain is hand-vetted for safety, quality and catch record.",
    img: discoverImg,
    alt: "Modern sport-fishing yacht cruising turquoise waters",
    badge: "Verified Captain",
  },
  {
    n: "02",
    title: "Book",
    body:
      "Secure your slot with escrow-backed payments. Your funds are held safely in the Fish-X vault until the trip is completed — total peace of mind for both angler and captain.",
    img: bookImg,
    alt: "Secure booking confirmation on a phone at the dock",
  },
  {
    n: "03",
    title: "Coordinate",
    body:
      "Chat directly with your captain to shape the trip. Target species, tackle, food & drink, pickup times — all handled inside the Fish-X concierge portal.",
    img: coordinateImg,
    alt: "Captain planning a trip on the bridge at dusk",
  },
  {
    n: "04",
    title: "Experience",
    body:
      "Cast off, catch the fish of your life and share your review. Funds release to the captain from escrow the moment you're safely back at the dock.",
    img: experienceImg,
    alt: "Angler holding a trophy fish at golden hour",
  },
];

function HowItWorksPage() {
  return (
    <div style={TOKENS}>
      <style>{`
        @keyframes hw-rise{0%{opacity:0;transform:translateY(24px)}100%{opacity:1;transform:translateY(0)}}
        .hw-rise{animation:hw-rise .8s both}
        .hw-num{font-family:var(--serif);font-weight:600;font-size:clamp(96px,10vw,148px);line-height:.9;-webkit-text-stroke:1.5px var(--sand);color:transparent;letter-spacing:-.02em}
        .hw-img{border-radius:20px;overflow:hidden;box-shadow:0 30px 80px -30px rgba(10,34,54,.35);border:1px solid var(--line);transition:transform .5s ease}
        .hw-img img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .8s ease}
        .hw-img:hover img{transform:scale(1.04)}
        details[data-hw]{background:var(--card);border:1px solid var(--line);border-radius:14px;transition:box-shadow .2s ease}
        details[data-hw][open]{box-shadow:0 12px 40px -20px rgba(10,34,54,.25)}
        details[data-hw] summary{list-style:none;cursor:pointer;padding:22px 26px;display:flex;justify-content:space-between;align-items:center;gap:20px;font-family:var(--serif);font-size:20px;color:var(--ink);font-weight:600}
        details[data-hw] summary::-webkit-details-marker{display:none}
        details[data-hw] .hw-chev{width:28px;height:28px;border-radius:50%;background:var(--paper2);display:grid;place-items:center;transition:transform .3s ease;color:var(--goldtext);font-weight:700;flex:none}
        details[data-hw][open] .hw-chev{transform:rotate(45deg);background:var(--sand);color:var(--navy)}
        details[data-hw] .hw-body{padding:0 26px 24px;color:var(--tmut);font-size:15.5px;line-height:1.65;border-top:1px solid var(--line);padding-top:18px}
        @media (max-width:820px){
          .hw-step{grid-template-columns:1fr !important}
          .hw-step-img{order:-1 !important}
          .hw-trust{grid-template-columns:1fr !important}
          .hw-stats{grid-template-columns:1fr 1fr !important}
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
            <Link to="/" style={navLink}>Home</Link>
            <a href="#steps" style={navLink}>The Process</a>
            <a href="#trust" style={navLink}>Escrow</a>
            <a href="#faq" style={navLink}>FAQ</a>
            <Link to="/become-a-captain" style={navLink}>Captains</Link>
          </nav>
          <Link to="/auth" style={ctaBtn}>Sign in</Link>
        </div>
      </header>

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
            className="hw-rise"
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
              The Fish-X Way
            </span>
          </div>
          <h1
            className="hw-rise"
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
            Booking a charter,<br />
            <span style={{ fontStyle: "italic", color: "var(--sand)" }}>made simple.</span>
          </h1>
          <p
            className="hw-rise"
            style={{
              fontSize: 18,
              lineHeight: 1.6,
              color: "var(--ondmut)",
              maxWidth: 620,
              margin: "0 auto",
            }}
          >
            Discover the world&rsquo;s best fishing grounds through a process built for clarity, security and exceptional service &mdash; every payment held in escrow until you&rsquo;re back at the dock.
          </p>
        </div>
      </section>

      {/* ============ STEPS ============ */}
      <section id="steps" style={{ padding: "100px 40px", background: "var(--paper)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gap: 110 }}>
          {STEPS.map((s, i) => {
            const reverse = i % 2 === 1;
            return (
              <div
                key={s.n}
                className="hw-step"
                style={{
                  display: "grid",
                  gridTemplateColumns: "5fr 7fr",
                  gap: 60,
                  alignItems: "center",
                  direction: reverse ? "rtl" : "ltr",
                }}
              >
                <div style={{ direction: "ltr" }}>
                  <div className="hw-num">{s.n}</div>
                  <h2
                    style={{
                      fontFamily: "var(--serif)",
                      fontWeight: 600,
                      fontSize: "clamp(34px,3.6vw,48px)",
                      margin: "10px 0 16px",
                      letterSpacing: "-.015em",
                      color: "var(--ink)",
                    }}
                  >
                    {s.title}
                  </h2>
                  <p style={{ fontSize: 17, lineHeight: 1.65, color: "var(--tmut)", margin: 0 }}>
                    {s.body}
                  </p>
                  {s.badge && (
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        marginTop: 22,
                        padding: "8px 14px",
                        borderRadius: 30,
                        background: "rgba(227,192,137,.15)",
                        border: "1px solid rgba(184,140,70,.3)",
                      }}
                    >
                      <span style={{ color: "var(--goldtext)", fontSize: 14 }}>✓</span>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: ".2em",
                          textTransform: "uppercase",
                          color: "var(--goldtext)",
                        }}
                      >
                        {s.badge}
                      </span>
                    </div>
                  )}
                </div>
                <div className="hw-step-img hw-img" style={{ direction: "ltr", aspectRatio: "16 / 10" }}>
                  <img src={s.img} alt={s.alt} loading="lazy" width={1280} height={720} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ============ ESCROW TRUST ============ */}
      <section
        id="trust"
        style={{
          padding: "100px 40px",
          background:
            "radial-gradient(120% 90% at 20% 0%, #0e2c44 0%, #0a2236 60%, #06151f 100%)",
          color: "var(--ond)",
        }}
      >
        <div
          className="hw-trust"
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 60,
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ ...eyebrow, color: "var(--sand)" }}>Escrow Protection</div>
            <h2
              style={{
                fontFamily: "var(--serif)",
                fontWeight: 600,
                fontSize: "clamp(34px,3.8vw,54px)",
                lineHeight: 1.1,
                letterSpacing: "-.015em",
                margin: "0 0 20px",
                color: "#fbfdff",
              }}
            >
              Your money is <span style={{ fontStyle: "italic", color: "var(--sand)" }}>protected.</span>
            </h2>
            <p style={{ fontSize: 17, lineHeight: 1.65, color: "var(--ondmut)", margin: "0 0 28px" }}>
              Fish-X pioneered the escrow standard for the fishing industry. Unlike traditional bookings where you pay direct, we hold your payment in a secure vault. Funds only release to the captain after you&rsquo;re safely back on land.
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 14 }}>
              {[
                ["🛡", "100% refundable for weather cancellations"],
                ["🔒", "Bank-grade 256-bit encryption"],
                ["☎", "24/7 dispute resolution support"],
              ].map(([i, t]) => (
                <li key={t} style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  <span
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 8,
                      background: "rgba(227,192,137,.15)",
                      border: "1px solid rgba(227,192,137,.3)",
                      display: "grid",
                      placeItems: "center",
                      color: "var(--sand)",
                    }}
                  >
                    {i}
                  </span>
                  <span style={{ color: "var(--ond)", fontSize: 15.5 }}>{t}</span>
                </li>
              ))}
            </ul>
          </div>

          <div
            className="hw-stats"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
            }}
          >
            {[
              { k: "$40M+", v: "Protected in 2025" },
              { k: "0%", v: "Fraud rate" },
            ].map((s) => (
              <div
                key={s.k}
                style={{
                  background: "rgba(255,255,255,.05)",
                  border: "1px solid var(--lined)",
                  borderRadius: 18,
                  padding: 32,
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--serif)",
                    fontSize: 48,
                    color: "var(--sand)",
                    fontWeight: 600,
                    lineHeight: 1,
                  }}
                >
                  {s.k}
                </div>
                <div
                  style={{
                    marginTop: 10,
                    fontSize: 11.5,
                    fontWeight: 700,
                    letterSpacing: ".2em",
                    textTransform: "uppercase",
                    color: "var(--ondmut)",
                  }}
                >
                  {s.v}
                </div>
              </div>
            ))}
            <div
              style={{
                gridColumn: "1 / -1",
                background:
                  "linear-gradient(135deg, rgba(227,192,137,.14), rgba(39,192,226,.08))",
                border: "1px solid rgba(227,192,137,.28)",
                borderRadius: 18,
                padding: 28,
              }}
            >
              <div
                style={{
                  fontFamily: "var(--serif)",
                  fontSize: 22,
                  color: "var(--sand)",
                  fontWeight: 600,
                  marginBottom: 6,
                }}
              >
                Verified by Fish-X SeaSafe&trade;
              </div>
              <div style={{ fontSize: 14.5, color: "var(--ondmut)", lineHeight: 1.55 }}>
                Industry-leading certification for digital maritime transactions and charter safety protocols.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section id="faq" style={{ padding: "100px 40px", background: "var(--paper)" }}>
        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 50 }}>
            <div style={eyebrow}>Answers</div>
            <h2
              style={{
                fontFamily: "var(--serif)",
                fontWeight: 600,
                fontSize: "clamp(34px,3.6vw,52px)",
                lineHeight: 1.1,
                letterSpacing: "-.01em",
                margin: 0,
                color: "var(--ink)",
              }}
            >
              Frequently asked questions
            </h2>
          </div>
          <div style={{ display: "grid", gap: 14 }}>
            {[
              {
                q: "What happens if the weather is bad?",
                a: "If the captain deems weather unsafe, you get a full refund from escrow or a free reschedule. Safety is our ultimate priority — the decision is always the captain's.",
              },
              {
                q: "Are fishing licenses included?",
                a: "For most professional charters in the Fish-X fleet, the vessel's license covers all passengers on board. This is noted clearly on each captain's profile under Amenities.",
              },
              {
                q: "How do I tip the crew?",
                a: "Gratuity is typically 15–20% of the trip cost. You can tip in cash at the dock or add it to your booking via the Fish-X portal after the trip completes.",
              },
              {
                q: "When does the captain get paid?",
                a: "Funds release from escrow to the captain automatically 24 hours after the trip is marked completed — assuming no dispute is opened. This protects both sides.",
              },
              {
                q: "Can I bring my own gear?",
                a: "Absolutely. Coordinate with your captain in the Fish-X concierge chat ahead of time — many welcome favorite rods and lures, and some will store them between trips.",
              },
            ].map((f) => (
              <details key={f.q} data-hw>
                <summary>
                  <span>{f.q}</span>
                  <span className="hw-chev">+</span>
                </summary>
                <div className="hw-body">{f.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section style={{ padding: "80px 40px 110px", background: "var(--paper)" }}>
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            position: "relative",
            borderRadius: 28,
            overflow: "hidden",
            background: "var(--navy)",
            color: "var(--ond)",
          }}
        >
          <img
            src={ctaBg}
            alt=""
            aria-hidden
            loading="lazy"
            width={1600}
            height={720}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: 0.35,
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(10,34,54,.55) 0%, rgba(6,21,31,.85) 100%)",
            }}
          />
          <div
            style={{
              position: "relative",
              zIndex: 1,
              padding: "90px 40px",
              textAlign: "center",
              maxWidth: 720,
              margin: "0 auto",
            }}
          >
            <h2
              style={{
                fontFamily: "var(--serif)",
                fontWeight: 600,
                fontSize: "clamp(36px,4.4vw,60px)",
                lineHeight: 1.08,
                letterSpacing: "-.015em",
                margin: "0 0 18px",
                color: "#fbfdff",
              }}
            >
              Ready to find your <span style={{ fontStyle: "italic", color: "var(--sand)" }}>next charter?</span>
            </h2>
            <p style={{ fontSize: 17, color: "var(--ondmut)", margin: "0 0 32px", lineHeight: 1.6 }}>
              Our concierge team is on the line to help you plan the perfect expedition.
            </p>
            <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
              <Link to="/discover" style={{ ...ctaBtn, padding: "16px 32px", fontSize: 13 }}>
                Find your next charter
              </Link>
              <Link
                to="/become-a-captain"
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
                  background: "rgba(255,255,255,.06)",
                  backdropFilter: "blur(6px)",
                }}
              >
                Become a captain
              </Link>
            </div>
          </div>
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
              The escrow-secured marketplace for the entire fishing industry &mdash; connecting captains, guides, marinas and gear brands with discerning anglers.
            </p>
          </div>
          <div style={{ fontSize: 12.5 }}>
            <div style={{ marginBottom: 8 }}>&copy; 2026 Fish-X Charters. All rights reserved.</div>
            <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
              <a href="#" style={{ color: "var(--ondmut)", textDecoration: "none" }}>Privacy</a>
              <a href="#" style={{ color: "var(--ondmut)", textDecoration: "none" }}>Terms</a>
              <a href="#" style={{ color: "var(--ondmut)", textDecoration: "none" }}>Escrow</a>
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
