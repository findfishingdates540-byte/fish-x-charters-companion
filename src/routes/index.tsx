import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

import yachtCoast from "@/assets/yacht-coast.png.asset.json";
import seraphina from "@/assets/seraphina.jpg.asset.json";
import seascape from "@/assets/seascape.jpg.asset.json";
import james from "@/assets/james.jpg.asset.json";
import robert from "@/assets/robert.jpg.asset.json";
import alessandro from "@/assets/cap-alessandro.png.asset.json";
import helm from "@/assets/helm.png.asset.json";
import julianne from "@/assets/rev-julianne.png.asset.json";
import marcus from "@/assets/rev-marcus.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fish-X Charters — Charter the world's finest waters" },
      {
        name: "description",
        content:
          "Book licensed captains for offshore, inshore and bluewater days. Every payment is held in secure escrow and only released after your trip is done.",
      },
      { property: "og:title", content: "Fish-X Charters" },
      {
        property: "og:description",
        content:
          "Premium charters, secured. Book verified captains worldwide — pay only after you fish.",
      },
      { property: "og:image", content: seascape.url },
    ],
  }),
  component: Landing,
});

const palette = {
  serif: "'Cormorant Garamond', Georgia, serif",
  sans: "'Hanken Grotesk', system-ui, sans-serif",
  ink: "#0d2236",
  navy: "#0a2236",
  navy2: "#0c2a42",
  deep: "#06151f",
  paper: "#f4f6f8",
  paper2: "#e9edf1",
  card: "#ffffff",
  sand: "#e3c089",
  sandsoft: "#f1ddbd",
  goldtext: "#b88c46",
  cyan: "#27c0e2",
  ond: "#eaf1f6",
  ondmut: "#9bb0c0",
  tmut: "#5c6b78",
  line: "rgba(13,34,54,.10)",
  lined: "rgba(255,255,255,.13)",
};

function Landing() {
  return (
    <div
      id="fishx-root"
      style={{
        background: palette.paper,
        color: palette.ink,
        fontFamily: palette.sans,
        overflowX: "hidden",
      }}
    >
      <style>{`
        @keyframes fx-floatY{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
        @keyframes fx-floatY2{0%,100%{transform:translateY(0)}50%{transform:translateY(9px)}}
        @keyframes fx-marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        @keyframes fx-sheen{0%{transform:translateX(-120%) skewX(-18deg)}55%,100%{transform:translateX(320%) skewX(-18deg)}}
        @keyframes fx-sonar{0%{transform:scale(.7);opacity:.55}70%{opacity:0}100%{transform:scale(2.1);opacity:0}}
        @keyframes fx-rise{0%{opacity:0;transform:translateY(24px)}100%{opacity:1;transform:translateY(0)}}
        #fishx-root *{box-sizing:border-box}
        #fishx-root ::selection{background:#e3c089;color:#0a2236}
        #fishx-root .fxc-card{transition:transform .5s cubic-bezier(.2,.7,.2,1),box-shadow .5s}
        #fishx-root .fxc-card:hover{transform:translateY(-7px);box-shadow:0 30px 60px -36px rgba(13,34,54,.4)}
        #fishx-root .fxc-cardimg{transition:transform .7s cubic-bezier(.2,.7,.2,1)}
        #fishx-root .fxc-imgwrap:hover .fxc-cardimg{transform:scale(1.06)}
        #fishx-root .fxc-faq[data-open="true"] .fxc-faq-a{max-height:280px}
        #fishx-root .fxc-faq[data-open="true"] .fxc-faq-ic{transform:rotate(45deg)}
        @media (prefers-reduced-motion: reduce){#fishx-root *{animation:none !important}}
      `}</style>

      <SiteHeader />
      <Hero />
      <Stats />
      <DestMarquee />
      <HowItWorks />
      <FeaturedCharters />
      <EscrowBand />
      <Captains />
      <Testimonials />
      <BecomeCaptain />
      <FAQ />
      <FinalCTA />
      <SiteFooter />
    </div>
  );
}

function SiteHeader() {
  return (
    <header
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
        <a href="#top" style={{ display: "flex", alignItems: "center", gap: 11, textDecoration: "none", color: palette.ond }}>
          <span style={{ width: 11, height: 11, background: palette.sand, transform: "rotate(45deg)", display: "inline-block", borderRadius: 1 }} />
          <span style={{ fontFamily: palette.serif, fontWeight: 600, fontSize: 21, letterSpacing: ".02em" }}>Fish-X Charters</span>
        </a>
        <nav style={{ display: "flex", alignItems: "center", gap: 34 }} className="max-md:!hidden">
          {[
            ["Charters", "#charters"],
            ["Destinations", "#destinations"],
            ["Captains", "#captains"],
            ["How it works", "#how"],
          ].map(([t, h]) => (
            <a key={t} href={h} style={{ color: palette.ond, textDecoration: "none", fontSize: 14, fontWeight: 500, opacity: 0.92 }}>
              {t}
            </a>
          ))}
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <Link to="/auth" style={{ color: palette.ond, textDecoration: "none", fontSize: 14, fontWeight: 600, opacity: 0.92 }}>
            Sign in
          </Link>
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: palette.sand,
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
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section
      id="top"
      style={{
        position: "relative",
        background: "radial-gradient(120% 90% at 12% 0%, #0e2c44 0%, #0a2236 46%, #081c2e 100%)",
        color: palette.ond,
        overflow: "hidden",
        padding: "36px 0 86px",
      }}
    >
      <div style={{ position: "absolute", top: -160, right: -120, width: 620, height: 620, background: "radial-gradient(circle, rgba(227,192,137,.16), rgba(227,192,137,0) 62%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -180, left: -140, width: 560, height: 560, background: "radial-gradient(circle, rgba(39,192,226,.10), rgba(39,192,226,0) 60%)", pointerEvents: "none" }} />
      <div
        style={{
          position: "relative",
          maxWidth: 1280,
          margin: "0 auto",
          padding: "0 40px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(400px,1fr))",
          gap: 54,
          alignItems: "center",
          minHeight: 560,
        }}
      >
        {/* LEFT */}
        <div style={{ maxWidth: 600 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, border: `1px solid ${palette.lined}`, borderRadius: 40, padding: "8px 15px 8px 12px", marginBottom: 26, animation: "fx-rise .8s both" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: palette.cyan, boxShadow: `0 0 10px ${palette.cyan}` }} />
            <span style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: ".2em", textTransform: "uppercase", color: palette.ondmut }}>
              Verified captains · Secure escrow
            </span>
          </div>
          <h1 style={{ fontFamily: palette.serif, fontWeight: 600, fontSize: "clamp(42px,5.4vw,74px)", lineHeight: 1.04, letterSpacing: "-.012em", margin: "0 0 22px", color: "#fbfdff" }}>
            <span style={{ display: "block", animation: "fx-rise .8s .05s both" }}>Charter the world's</span>
            <span style={{ display: "block", animation: "fx-rise .8s .14s both" }}>
              finest waters —{" "}
              <span style={{ fontStyle: "italic", color: palette.sand }}>
                and pay only<br />after you fish.
              </span>
            </span>
          </h1>
          <p style={{ fontSize: 18, lineHeight: 1.6, color: palette.ondmut, maxWidth: 498, margin: "0 0 32px", animation: "fx-rise .8s .22s both" }}>
            Book licensed captains for offshore, inshore and bluewater days. Your payment is held in secure escrow and released only when your trip is done — so every cast is protected.
          </p>
          <SearchWidget />
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px 22px", marginTop: 22 }}>
            <span style={{ fontSize: 13, color: palette.ondmut }}><b style={{ color: "#fff" }}>1,200+</b> verified captains</span>
            <span style={{ width: 3, height: 3, borderRadius: "50%", background: palette.ondmut, opacity: 0.5 }} />
            <span style={{ fontSize: 13, color: palette.ondmut }}><b style={{ color: "#fff" }}>38</b> destinations</span>
            <span style={{ width: 3, height: 3, borderRadius: "50%", background: palette.ondmut, opacity: 0.5 }} />
            <span style={{ fontSize: 13, color: palette.ondmut }}><b style={{ color: palette.sand }}>4.96★</b> avg rating</span>
          </div>
        </div>

        {/* COLLAGE */}
        <div style={{ position: "relative", height: 540 }} className="max-md:!hidden">
          <div style={{ position: "absolute", top: 8, right: 6, width: 322, height: 438, borderRadius: 18, overflow: "hidden", border: "6px solid #fff", boxShadow: "0 40px 80px -34px rgba(0,0,0,.75)" }}>
            <img src={seascape.url} alt="Golden-hour open water" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 35%" }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(10,34,54,0) 55%,rgba(10,34,54,.28))" }} />
          </div>
          <div style={{ position: "absolute", left: 0, bottom: 18, width: 296, height: 206, borderRadius: 16, overflow: "hidden", border: "6px solid #fff", boxShadow: "0 34px 64px -30px rgba(0,0,0,.7)" }}>
            <img src={yachtCoast.url} alt="Charter vessel on the coast" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <div style={{ position: "absolute", left: -6, top: 40, display: "flex", alignItems: "center", gap: 11, background: "rgba(255,255,255,.96)", borderRadius: 14, padding: "11px 16px 11px 12px", boxShadow: "0 20px 44px -20px rgba(0,0,0,.55)", animation: "fx-floatY 6s ease-in-out infinite" }}>
            <span style={{ width: 34, height: 34, borderRadius: "50%", background: palette.sandsoft, display: "grid", placeItems: "center", color: palette.goldtext, fontSize: 16 }}>✓</span>
            <span style={{ lineHeight: 1.15 }}>
              <span style={{ display: "block", fontSize: 9.5, fontWeight: 700, letterSpacing: ".16em", textTransform: "uppercase", color: palette.goldtext }}>Verified Captain</span>
              <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#16303f" }}>Licensed &amp; checked</span>
            </span>
          </div>
          <div style={{ position: "absolute", right: -14, bottom: 84, display: "flex", alignItems: "center", gap: 10, background: palette.navy, border: `1px solid ${palette.lined}`, borderRadius: 13, padding: "11px 15px", boxShadow: "0 18px 40px -18px rgba(0,0,0,.6)", animation: "fx-floatY2 7s ease-in-out infinite" }}>
            <span style={{ fontFamily: palette.serif, fontSize: 26, fontWeight: 600, color: palette.sand, lineHeight: 1 }}>4.96</span>
            <span style={{ lineHeight: 1.2 }}>
              <span style={{ display: "block", fontSize: 11, color: palette.sand }}>★★★★★</span>
              <span style={{ display: "block", fontSize: 11, color: palette.ondmut }}>12,400 trips</span>
            </span>
          </div>
          <div style={{ position: "absolute", right: 30, top: -6, display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(6,21,31,.66)", border: `1px solid ${palette.lined}`, borderRadius: 30, padding: "8px 14px", backdropFilter: "blur(4px)", animation: "fx-floatY 8s ease-in-out infinite" }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: palette.cyan }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: palette.ond }}>Secured by escrow</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function SearchWidget() {
  return (
    <div style={{ background: "rgba(255,255,255,.06)", border: `1px solid ${palette.lined}`, borderRadius: 18, padding: 10, backdropFilter: "blur(8px)", boxShadow: "0 24px 60px -28px rgba(0,0,0,.6)", maxWidth: 560 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr auto auto", gap: 4, alignItems: "stretch" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, padding: "10px 14px", borderRadius: 12 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".16em", textTransform: "uppercase", color: palette.ondmut }}>Destination</span>
          <select defaultValue="Florida Keys" style={{ appearance: "none", background: "transparent", border: 0, color: "#fff", fontFamily: palette.sans, fontSize: 15, fontWeight: 600, cursor: "pointer", outline: "none" }}>
            {["Florida Keys", "Cabo San Lucas", "Porto Cervo", "Montauk", "Kona, Hawaii"].map((d) => (
              <option key={d} style={{ color: palette.navy }}>{d}</option>
            ))}
          </select>
        </label>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "10px 14px", borderRadius: 12, borderLeft: `1px solid ${palette.lined}` }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".16em", textTransform: "uppercase", color: palette.ondmut }}>Date</span>
          <span style={{ color: "#fff", fontSize: 15, fontWeight: 600 }}>Jun 14, 2026</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "10px 14px", borderRadius: 12, borderLeft: `1px solid ${palette.lined}` }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".16em", textTransform: "uppercase", color: palette.ondmut }}>Anglers</span>
          <span style={{ color: "#fff", fontSize: 16, fontWeight: 700, textAlign: "center" }}>2</span>
        </div>
        <Link
          to="/auth"
          search={{ mode: "signup" }}
          style={{
            position: "relative",
            overflow: "hidden",
            background: palette.sand,
            color: "#1c1303",
            border: 0,
            borderRadius: 13,
            padding: "0 22px",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: ".08em",
            textTransform: "uppercase",
            textDecoration: "none",
          }}
        >
          Search →
          <span style={{ position: "absolute", top: 0, left: 0, width: "40%", height: "100%", background: "linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent)", animation: "fx-sheen 5.5s ease-in-out 1.5s infinite" }} />
        </Link>
      </div>
    </div>
  );
}

function Stats() {
  const stats = [
    { v: "1,200+", l: "Verified captains" },
    { v: "38", l: "Destinations worldwide" },
    { v: "$0", l: "Charged until your captain confirms" },
    { v: "4.96★", l: "Average trip rating" },
  ];
  return (
    <section style={{ background: palette.paper, borderBottom: `1px solid ${palette.line}` }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))" }}>
        {stats.map((s, i) => (
          <div key={s.l} style={{ padding: "40px 28px 38px", borderRight: i < 3 ? `1px solid ${palette.line}` : undefined }}>
            <div style={{ fontFamily: palette.serif, fontWeight: 600, fontSize: 46, letterSpacing: "-.02em", color: palette.ink, lineHeight: 1 }}>
              {s.v.includes("★") ? (<><span>{s.v.replace("★", "")}</span><span style={{ color: palette.sand, fontSize: 30 }}> ★</span></>) : s.v}
            </div>
            <div style={{ marginTop: 8, fontSize: 13.5, color: palette.tmut }}>{s.l}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function DestMarquee() {
  const items = ["Islamorada", "Porto Cervo", "Cabo San Lucas", "Montauk", "Key West", "Monaco", "Kona", "Tropea"];
  const Row = () => (
    <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
      {items.map((n) => (
        <span key={n} style={{ display: "inline-flex", alignItems: "center" }}>
          <span style={{ fontFamily: palette.serif, fontStyle: "italic", fontSize: 26, color: palette.ondmut, padding: "0 34px" }}>{n}</span>
          <span style={{ color: palette.sand }}>◆</span>
        </span>
      ))}
    </div>
  );
  return (
    <section id="destinations" style={{ background: palette.navy, color: palette.ond, padding: "22px 0", overflow: "hidden", borderBottom: `1px solid ${palette.lined}` }}>
      <div style={{ display: "flex", width: "max-content", gap: 0, animation: "fx-marquee 42s linear infinite", willChange: "transform" }}>
        <Row />
        <Row />
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { n: "01", t: "Reserve your slot", d: "Choose a captain, date and party size. Your card is authorized to hold the date — but nothing is charged yet.", icon: (<><rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 9h18M8 3v4M16 3v4" /><circle cx="12" cy="15" r="2" fill="currentColor" stroke="none" /></>) },
    { n: "02", t: "Funds held in escrow", d: "The moment your captain confirms, payment moves into a secure, segregated escrow account — not their pocket.", icon: (<><rect x="4" y="10" width="16" height="11" rx="2.5" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /><circle cx="12" cy="15.5" r="1.4" fill="currentColor" stroke="none" /></>) },
    { n: "03", t: "Fish, then they're paid", d: "Money releases to your captain only after the trip is completed. Weather cancels? You're refunded, no debate.", icon: (<><circle cx="12" cy="12" r="9" /><path d="M8 12.5l2.6 2.6L16 9.5" /></>) },
  ];
  return (
    <section id="how" style={{ background: palette.paper, padding: "104px 0 96px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px" }}>
        <div style={{ textAlign: "center", maxWidth: 660, margin: "0 auto 64px" }}>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".22em", textTransform: "uppercase", color: palette.goldtext }}>How Fish-X works</span>
          <h2 style={{ fontFamily: palette.serif, fontWeight: 600, fontSize: "clamp(31px,3.6vw,48px)", letterSpacing: "-.015em", lineHeight: 1.08, margin: "16px 0 14px", color: palette.ink }}>
            No deposits to strangers.<br />No surprises at the dock.
          </h2>
          <p style={{ fontSize: 17, lineHeight: 1.6, color: palette.tmut, margin: 0 }}>
            Three steps from booking to the bite — with your money protected the entire way.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))", gap: 26 }}>
          {steps.map((s) => (
            <div key={s.n} className="fxc-card" style={{ background: palette.card, border: `1px solid ${palette.line}`, borderRadius: 20, padding: "36px 32px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 26 }}>
                <span style={{ fontFamily: palette.serif, fontSize: 17, fontWeight: 600, color: palette.goldtext }}>{s.n}</span>
                <span style={{ width: 48, height: 48, borderRadius: 13, background: palette.paper, border: `1px solid ${palette.line}`, display: "grid", placeItems: "center", color: palette.ink }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">{s.icon}</svg>
                </span>
              </div>
              <h3 style={{ fontFamily: palette.serif, fontWeight: 600, fontSize: 25, margin: "0 0 10px", color: palette.ink }}>{s.t}</h3>
              <p style={{ fontSize: 15, lineHeight: 1.62, color: palette.tmut, margin: 0 }}>{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

type Charter = { img: string; loc: string; rating: string; title: string; tags: string[]; capImg: string; capName: string; price: string; capObj?: string };
const charters: Charter[] = [
  { img: yachtCoast.url, loc: "Islamorada, Florida Keys", rating: "4.96", title: "Offshore Tarpon & Sailfish", tags: ["8 hrs", "Up to 4 anglers", "Tackle incl."], capImg: james.url, capName: "Capt. James Sterling", price: "$850", capObj: "50% 30%" },
  { img: seraphina.url, loc: "Porto Cervo, Sardinia", rating: "4.98", title: "The Seraphina Day Charter", tags: ["Full day", "Up to 12", "Private chef"], capImg: alessandro.url, capName: "Capt. Alessandro", price: "$850", capObj: "50% 28%" },
  { img: seascape.url, loc: "Cabo San Lucas", rating: "4.92", title: "Bluewater Sunset Run", tags: ["5 hrs", "Up to 6", "Marlin & dorado"], capImg: robert.url, capName: "Capt. Robert Vance", price: "$720", capObj: "50% 24%" },
];

function FeaturedCharters() {
  return (
    <section id="charters" style={{ background: palette.paper, padding: "24px 0 104px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, marginBottom: 40, flexWrap: "wrap" }}>
          <div>
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".22em", textTransform: "uppercase", color: palette.goldtext }}>Featured charters</span>
            <h2 style={{ fontFamily: palette.serif, fontWeight: 600, fontSize: "clamp(31px,3.6vw,48px)", letterSpacing: "-.015em", lineHeight: 1.05, margin: "14px 0 0", color: palette.ink }}>
              Days worth clearing the calendar for.
            </h2>
          </div>
          <a href="#" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: palette.ink, textDecoration: "none", fontSize: 14, fontWeight: 600, borderBottom: `1px solid ${palette.sand}`, paddingBottom: 3 }}>
            Browse all 1,200 charters <span style={{ color: palette.goldtext }}>→</span>
          </a>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))", gap: 26 }}>
          {charters.map((c) => (
            <article key={c.title} className="fxc-card fxc-imgwrap" style={{ background: palette.card, border: `1px solid ${palette.line}`, borderRadius: 20, overflow: "hidden" }}>
              <div style={{ position: "relative", height: 212, overflow: "hidden" }}>
                <img className="fxc-cardimg" src={c.img} alt={c.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <span style={{ position: "absolute", top: 14, left: 14, display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(6,21,31,.72)", backdropFilter: "blur(4px)", color: palette.ond, fontSize: 10.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", padding: "7px 11px", borderRadius: 30 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: palette.cyan }} />
                  Secure escrow
                </span>
              </div>
              <div style={{ padding: "22px 22px 24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: palette.tmut, marginBottom: 9 }}>
                  <span style={{ color: palette.sand }}>★</span><b style={{ color: palette.ink }}>{c.rating}</b><span style={{ opacity: 0.5 }}>·</span> {c.loc}
                </div>
                <h3 style={{ fontFamily: palette.serif, fontWeight: 600, fontSize: 23, lineHeight: 1.12, margin: "0 0 14px", color: palette.ink }}>{c.title}</h3>
                <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
                  {c.tags.map((t) => (
                    <span key={t} style={{ fontSize: 11.5, fontWeight: 600, color: palette.ink, background: palette.paper, border: `1px solid ${palette.line}`, borderRadius: 8, padding: "6px 10px" }}>{t}</span>
                  ))}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: `1px solid ${palette.line}`, paddingTop: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <img src={c.capImg} alt={c.capName} style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "cover", objectPosition: c.capObj }} />
                    <span style={{ fontSize: 13, color: palette.tmut }}>{c.capName}</span>
                  </div>
                  <div style={{ textAlign: "right", lineHeight: 1 }}>
                    <span style={{ fontSize: 11, color: palette.tmut }}>from </span>
                    <span style={{ fontFamily: palette.serif, fontSize: 24, fontWeight: 600, color: palette.goldtext }}>{c.price}</span>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function EscrowBand() {
  const trackRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const io = new IntersectionObserver((ents) => {
      ents.forEach((e) => {
        if (e.isIntersecting) {
          (el.querySelector("[data-fill]") as HTMLElement).style.width = "33%";
          io.disconnect();
        }
      });
    }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <section style={{ position: "relative", background: palette.navy, color: palette.ond, overflow: "hidden" }}>
      <img src={seascape.url} alt="" aria-hidden style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 42%", opacity: 0.22 }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(100deg,#06151f 8%,rgba(8,28,46,.86) 48%,rgba(8,28,46,.5) 100%)" }} />
      <div style={{ position: "relative", maxWidth: 1280, margin: "0 auto", padding: "104px 40px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(360px,1fr))", gap: 64, alignItems: "center" }}>
        <div>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".22em", textTransform: "uppercase", color: palette.sand }}>The Fish-X guarantee</span>
          <h2 style={{ fontFamily: palette.serif, fontWeight: 600, fontSize: "clamp(32px,3.8vw,50px)", lineHeight: 1.06, letterSpacing: "-.015em", margin: "18px 0 18px", color: "#fbfdff" }}>
            Your money never leaves the dock unprotected.
          </h2>
          <p style={{ fontSize: 17, lineHeight: 1.64, color: palette.ondmut, maxWidth: 520, margin: "0 0 30px" }}>
            Every booking is backed by segregated escrow and bank-level encryption. Captains only get paid after you've had your day on the water — the way it should be.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {["Segregated escrow accounts", "Bank-level encryption", "Free cancellation 48h"].map((c) => (
              <span key={c} style={{ display: "inline-flex", alignItems: "center", gap: 8, border: `1px solid ${palette.lined}`, borderRadius: 30, padding: "9px 15px", fontSize: 13, color: palette.ond }}>
                <span style={{ color: palette.cyan }}>✓</span> {c}
              </span>
            ))}
          </div>
        </div>
        <div ref={trackRef} style={{ background: "rgba(255,255,255,.05)", border: `1px solid ${palette.lined}`, borderRadius: 22, padding: "34px 32px", backdropFilter: "blur(6px)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 30 }}>
            <span style={{ position: "relative", width: 50, height: 50, borderRadius: "50%", background: "rgba(39,192,226,.12)", display: "grid", placeItems: "center", color: palette.cyan }}>
              <span style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `1px solid ${palette.cyan}`, animation: "fx-sonar 3.2s ease-out infinite" }} />
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="4" y="10" width="16" height="11" rx="2.5" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
            </span>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".16em", textTransform: "uppercase", color: palette.sand }}>Live booking</div>
              <div style={{ fontFamily: palette.serif, fontSize: 20, color: "#fff" }}>The Seraphina · $875.00</div>
            </div>
          </div>
          <div style={{ position: "relative", display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ position: "absolute", left: 7, right: 7, top: 7, height: 2, background: palette.lined }} />
            <div data-fill style={{ position: "absolute", left: 7, top: 7, height: 2, width: 0, background: `linear-gradient(90deg,${palette.cyan},${palette.sand})`, transition: "width 1.6s cubic-bezier(.4,0,.1,1)" }} />
            <span style={{ position: "relative", width: 16, height: 16, borderRadius: "50%", background: palette.cyan, boxShadow: "0 0 0 4px rgba(39,192,226,.18)" }} />
            <span style={{ position: "relative", width: 16, height: 16, borderRadius: "50%", background: palette.navy2, border: `2px solid ${palette.lined}` }} />
            <span style={{ position: "relative", width: 16, height: 16, borderRadius: "50%", background: palette.navy2, border: `2px solid ${palette.lined}` }} />
            <span style={{ position: "relative", width: 16, height: 16, borderRadius: "50%", background: palette.navy2, border: `2px solid ${palette.lined}` }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: palette.ondmut, letterSpacing: ".02em" }}>
            <span style={{ width: "25%" }}>Reserved</span>
            <span style={{ width: "25%", textAlign: "center" }}>Held in escrow</span>
            <span style={{ width: "25%", textAlign: "center" }}>Trip done</span>
            <span style={{ width: "25%", textAlign: "right" }}>Captain paid</span>
          </div>
          <div style={{ marginTop: 26, paddingTop: 22, borderTop: `1px solid ${palette.lined}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, color: palette.ondmut }}>Status</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: palette.cyan }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: palette.cyan, boxShadow: `0 0 8px ${palette.cyan}` }} />
              Funds held securely
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

type Capt = { name: string; loc: string; img: string; imgObj: string; stats: { v: string; l: string; gold?: boolean }[]; bio: string };
const captains: Capt[] = [
  { name: "Capt. Alessandro Greco", loc: "Porto Cervo, Sardinia", img: alessandro.url, imgObj: "50% 26%", stats: [{ v: "12 yrs", l: "experience" }, { v: "4.98", l: "rated", gold: true }, { v: "100GT", l: "master" }], bio: "Mediterranean specialist. Speaks EN · IT · FR, with a chef aboard for full-day runs." },
  { name: "Capt. James Sterling", loc: "Islamorada, Florida Keys", img: james.url, imgObj: "50% 32%", stats: [{ v: "20+ yrs", l: "experience" }, { v: "5.0", l: "rated", gold: true }, { v: "317", l: "trips" }], bio: "Tournament-grade offshore captain. Custom-rigged for tarpon, sailfish and mahi." },
  { name: "Capt. Robert Vance", loc: "Cabo San Lucas, MX", img: robert.url, imgObj: "50% 22%", stats: [{ v: "9 yrs", l: "experience" }, { v: "4.92", l: "rated", gold: true }, { v: "EN/ES", l: "languages" }], bio: "Bluewater marlin hunter. Sunset and overnight runs out of the Cabo marina." },
];

function Captains() {
  return (
    <section id="captains" style={{ background: palette.paper, padding: "104px 0 100px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px" }}>
        <div style={{ textAlign: "center", maxWidth: 660, margin: "0 auto 58px" }}>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".22em", textTransform: "uppercase", color: palette.goldtext }}>Meet the captains</span>
          <h2 style={{ fontFamily: palette.serif, fontWeight: 600, fontSize: "clamp(31px,3.6vw,48px)", letterSpacing: "-.015em", lineHeight: 1.06, margin: "16px 0 14px", color: palette.ink }}>
            Trust the day to people who live on the water.
          </h2>
          <p style={{ fontSize: 17, lineHeight: 1.6, color: palette.tmut, margin: 0 }}>
            Every captain is licensed, background-checked and rated by real anglers before they ever take a booking.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))", gap: 26 }}>
          {captains.map((c) => (
            <article key={c.name} className="fxc-card" style={{ background: palette.card, border: `1px solid ${palette.line}`, borderRadius: 20, padding: 30 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 22 }}>
                <div style={{ position: "relative", flex: "none" }}>
                  <img src={c.img} alt={c.name} style={{ width: 74, height: 74, borderRadius: "50%", objectFit: "cover", objectPosition: c.imgObj, border: `1px solid ${palette.line}` }} />
                  <span style={{ position: "absolute", bottom: -2, right: -2, width: 24, height: 24, borderRadius: "50%", background: palette.sand, display: "grid", placeItems: "center", color: "#1c1303", fontSize: 12, border: `2px solid ${palette.card}` }}>✓</span>
                </div>
                <div>
                  <h3 style={{ fontFamily: palette.serif, fontWeight: 600, fontSize: 22, margin: 0, color: palette.ink }}>{c.name}</h3>
                  <div style={{ fontSize: 13, color: palette.tmut, marginTop: 2 }}>{c.loc}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 18, padding: "16px 0", borderTop: `1px solid ${palette.line}`, borderBottom: `1px solid ${palette.line}`, marginBottom: 18 }}>
                {c.stats.map((s) => (
                  <div key={s.l}>
                    <div style={{ fontFamily: palette.serif, fontSize: 21, fontWeight: 600, color: palette.ink }}>
                      {s.v}{s.gold && <span style={{ color: palette.sand, fontSize: 14 }}> ★</span>}
                    </div>
                    <div style={{ fontSize: 11, color: palette.tmut }}>{s.l}</div>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.55, color: palette.tmut, margin: 0 }}>{c.bio}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const items = [
    { name: "Julianne V.", loc: "Porto Cervo · October 2023", img: julianne.url, quote: "An unforgettable day. The crew's attention to detail was beyond anything we'd had — and the hidden coves Alessandro ran us to were breathtaking." },
    { name: "Marcus Thorne", loc: "Islamorada · September 2023", img: marcus.url, quote: "Absolute perfection from start to finish. A high-stakes luxury experience that delivered on every promise — and knowing the payment was protected made booking effortless." },
  ];
  return (
    <section style={{ background: palette.paper2, padding: "96px 0", borderTop: `1px solid ${palette.line}`, borderBottom: `1px solid ${palette.line}` }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, flexWrap: "wrap", marginBottom: 42 }}>
          <h2 style={{ fontFamily: palette.serif, fontWeight: 600, fontSize: "clamp(30px,3.6vw,46px)", letterSpacing: "-.015em", lineHeight: 1.05, margin: 0, color: palette.ink, maxWidth: 560 }}>
            What anglers say after the lines come in.
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontFamily: palette.serif, fontSize: 52, fontWeight: 600, color: palette.ink, lineHeight: 1 }}>4.96</span>
            <div style={{ lineHeight: 1.4 }}>
              <div style={{ color: palette.sand, fontSize: 16, letterSpacing: 2 }}>★★★★★</div>
              <div style={{ fontSize: 13, color: palette.tmut }}>from 4,800+ verified trips</div>
            </div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(330px,1fr))", gap: 26 }}>
          {items.map((t) => (
            <figure key={t.name} style={{ background: palette.card, border: `1px solid ${palette.line}`, borderRadius: 20, padding: "34px 34px 30px", margin: 0 }}>
              <div style={{ color: palette.sand, fontSize: 15, letterSpacing: 2, marginBottom: 16 }}>★★★★★</div>
              <blockquote style={{ fontFamily: palette.serif, fontSize: 23, lineHeight: 1.4, color: palette.ink, margin: "0 0 24px", fontWeight: 500 }}>
                "{t.quote}"
              </blockquote>
              <figcaption style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <img src={t.img} alt={t.name} style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: `1px solid ${palette.line}` }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: palette.ink }}>{t.name}</div>
                  <div style={{ fontSize: 12.5, color: palette.tmut }}>{t.loc}</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function BecomeCaptain() {
  return (
    <section style={{ background: palette.paper, padding: "104px 0" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(340px,1fr))", gap: 64, alignItems: "center" }}>
        <div>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".22em", textTransform: "uppercase", color: palette.goldtext }}>For captains</span>
          <h2 style={{ fontFamily: palette.serif, fontWeight: 600, fontSize: "clamp(31px,3.6vw,48px)", letterSpacing: "-.015em", lineHeight: 1.06, margin: "16px 0 18px", color: palette.ink }}>
            List your boat. Get paid the moment the trip ends.
          </h2>
          <p style={{ fontSize: 17, lineHeight: 1.62, color: palette.tmut, maxWidth: 500, margin: "0 0 28px" }}>
            Reach high-intent anglers, set your own schedule and let escrow handle the money. No chasing deposits, no no-shows — just confirmed, funded trips.
          </p>
          <div style={{ display: "flex", gap: 34, marginBottom: 32 }}>
            <div>
              <div style={{ fontFamily: palette.serif, fontSize: 34, fontWeight: 600, color: palette.ink }}>$12,450</div>
              <div style={{ fontSize: 13, color: palette.tmut }}>avg. monthly earnings</div>
            </div>
            <div style={{ borderLeft: `1px solid ${palette.line}`, paddingLeft: 34 }}>
              <div style={{ fontFamily: palette.serif, fontSize: 34, fontWeight: 600, color: palette.ink }}>98%</div>
              <div style={{ fontSize: 13, color: palette.tmut }}>captain response rate</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            <Link to="/auth" search={{ mode: "signup" }} style={{ display: "inline-flex", alignItems: "center", gap: 9, background: palette.ink, color: "#fff", textDecoration: "none", fontSize: 13, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", padding: "16px 26px", borderRadius: 40 }}>
              Become a Fish-X captain <span>→</span>
            </Link>
            <Link to="/auth" style={{ fontSize: 14, fontWeight: 600, color: palette.ink, textDecoration: "none", borderBottom: `1px solid ${palette.sand}`, paddingBottom: 2 }}>
              Already a captain? Sign in
            </Link>
          </div>
        </div>
        <div style={{ position: "relative" }}>
          <div style={{ borderRadius: 22, overflow: "hidden", border: `1px solid ${palette.line}`, boxShadow: "0 40px 80px -44px rgba(13,34,54,.5)" }}>
            <img src={helm.url} alt="At the helm" style={{ width: "100%", height: 420, objectFit: "cover" }} />
          </div>
          <div style={{ position: "absolute", right: -16, bottom: -20, background: palette.card, border: `1px solid ${palette.line}`, borderRadius: 16, padding: "18px 22px", boxShadow: "0 24px 50px -26px rgba(13,34,54,.5)", display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ width: 42, height: 42, borderRadius: 12, background: palette.sandsoft, display: "grid", placeItems: "center", color: palette.goldtext }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 18V8M9 18V5M14 18v-7M19 18v-11" /></svg>
            </span>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: palette.goldtext }}>This month</div>
              <div style={{ fontFamily: palette.serif, fontSize: 20, fontWeight: 600, color: palette.ink }}>+$3,820 booked</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const faqs = [
  { q: "How does escrow actually protect my payment?", a: "When your captain confirms, your payment is moved into a segregated escrow account held by our regulated partner — never the captain's own balance. It only releases after your trip is marked complete, so the funds are protected the entire time." },
  { q: "When is my captain actually paid?", a: "Payout is released automatically once your trip is completed — typically the evening you return to the dock. If something goes wrong, our team reviews before any funds move." },
  { q: "What happens if weather cancels the trip?", a: "If your captain calls it for weather or safety, you're fully refunded from escrow or rebooked at no cost — your choice. You also get free cancellation up to 48 hours before departure." },
  { q: "Are all captains really verified?", a: "Yes. Every captain submits their license, vessel insurance and credentials, passes a background check, and maintains a live angler rating. The gold seal on a listing means all checks are current." },
  { q: "What's included — and can I bring my own gear?", a: "Most charters include premium tackle, live bait, fuel, safety equipment and catch handling — each listing spells out exactly what's covered. You're always welcome to bring your own rods; just let your captain know in the booking thread." },
];

function FAQ() {
  return (
    <section style={{ background: palette.navy, color: palette.ond, padding: "100px 0" }}>
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "0 40px" }}>
        <div style={{ textAlign: "center", marginBottom: 50 }}>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".22em", textTransform: "uppercase", color: palette.sand }}>Questions</span>
          <h2 style={{ fontFamily: palette.serif, fontWeight: 600, fontSize: "clamp(30px,3.6vw,46px)", letterSpacing: "-.015em", margin: "14px 0 0", color: "#fbfdff" }}>
            Everything you might ask before booking.
          </h2>
        </div>
        <div style={{ borderTop: `1px solid ${palette.lined}` }}>
          {faqs.map((f, i) => (
            <FaqItem key={i} q={f.q} a={f.a} defaultOpen={i === 0} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqItem({ q, a, defaultOpen }: { q: string; a: string; defaultOpen?: boolean }) {
  return (
    <details className="fxc-faq group" style={{ borderBottom: `1px solid ${palette.lined}` }} open={defaultOpen}>
      <summary
        style={{
          listStyle: "none",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 20,
          color: "#fff",
          padding: "26px 4px",
          cursor: "pointer",
          fontFamily: palette.serif,
          fontSize: 22,
          fontWeight: 600,
        }}
      >
        {q}
        <span className="fxc-faq-ic group-open:rotate-45" style={{ flex: "none", width: 28, height: 28, borderRadius: "50%", border: `1px solid ${palette.lined}`, display: "grid", placeItems: "center", fontSize: 18, transition: "transform .35s", color: palette.sand }}>+</span>
      </summary>
      <p style={{ fontSize: 15.5, lineHeight: 1.64, color: palette.ondmut, margin: "0 0 26px", maxWidth: 680 }}>{a}</p>
    </details>
  );
}

function FinalCTA() {
  return (
    <section style={{ position: "relative", overflow: "hidden", background: palette.deep, color: palette.ond }}>
      <img src={seascape.url} alt="" aria-hidden style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 30%", opacity: 0.34 }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(6,21,31,.62),rgba(6,21,31,.8))" }} />
      <div style={{ position: "relative", maxWidth: 820, margin: "0 auto", padding: "118px 40px", textAlign: "center" }}>
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".24em", textTransform: "uppercase", color: palette.sand }}>Tight lines ahead</span>
        <h2 style={{ fontFamily: palette.serif, fontWeight: 600, fontSize: "clamp(40px,6.4vw,66px)", lineHeight: 1.02, letterSpacing: "-.02em", margin: "18px 0 18px", color: "#fff" }}>
          Your next trophy<br />is already biting.
        </h2>
        <p style={{ fontSize: 18, lineHeight: 1.6, color: palette.ondmut, maxWidth: 540, margin: "0 auto 34px" }}>
          Find a verified captain and book in minutes — protected by escrow, every single time.
        </p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
          <a href="#charters" style={{ position: "relative", overflow: "hidden", display: "inline-flex", alignItems: "center", gap: 10, background: palette.sand, color: "#1c1303", textDecoration: "none", fontSize: 13, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", padding: "18px 32px", borderRadius: 40 }}>
            Find a charter <span style={{ fontSize: 16 }}>→</span>
            <span style={{ position: "absolute", top: 0, left: 0, width: "40%", height: "100%", background: "linear-gradient(90deg,transparent,rgba(255,255,255,.5),transparent)", animation: "fx-sheen 6s ease-in-out 2s infinite" }} />
          </a>
          <a href="#how" style={{ display: "inline-flex", alignItems: "center", gap: 9, border: `1px solid ${palette.lined}`, color: "#fff", textDecoration: "none", fontSize: 13, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", padding: "18px 28px", borderRadius: 40 }}>
            See how it works
          </a>
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  const cols: { t: string; links: string[] }[] = [
    { t: "Explore", links: ["Charters", "Destinations", "Captains", "Gift cards"] },
    { t: "Company", links: ["About", "Careers", "Press", "Journal"] },
    { t: "Trust", links: ["How escrow works", "Safety", "Insurance", "Verified program"] },
    { t: "Legal", links: ["Terms of service", "Privacy", "Cancellation policy"] },
  ];
  return (
    <footer style={{ background: palette.deep, color: palette.ond, borderTop: `1px solid ${palette.lined}` }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "72px 40px 0", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 40 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 16 }}>
            <span style={{ width: 11, height: 11, background: palette.sand, transform: "rotate(45deg)", display: "inline-block", borderRadius: 1 }} />
            <span style={{ fontFamily: palette.serif, fontWeight: 600, fontSize: 21, letterSpacing: ".02em", color: "#fff" }}>Fish-X Charters</span>
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: palette.ondmut, maxWidth: 260, margin: "0 0 20px" }}>
            Premium charters, secured. Book verified captains worldwide and pay only after you fish.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            {["IG", "X", "YT"].map((s) => (
              <a key={s} href="#" aria-label={s} style={{ width: 38, height: 38, borderRadius: "50%", border: `1px solid ${palette.lined}`, display: "grid", placeItems: "center", color: palette.ondmut, textDecoration: "none", fontSize: 13 }}>{s}</a>
            ))}
          </div>
        </div>
        {cols.map((c) => (
          <div key={c.t}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".16em", textTransform: "uppercase", color: palette.sand, marginBottom: 16 }}>{c.t}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              {c.links.map((l) => (
                <a key={l} href="#" style={{ fontSize: 14, color: palette.ondmut, textDecoration: "none" }}>{l}</a>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{ maxWidth: 1280, margin: "56px auto 0", padding: "28px 40px 36px", borderTop: `1px solid ${palette.lined}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12.5, color: palette.ondmut }}>© {new Date().getFullYear()} Fish-X Charters. All rights reserved. · Funds held in segregated escrow accounts.</span>
        <span style={{ fontSize: 12.5, color: palette.ondmut }}>🌐 United States (USD $)</span>
      </div>
    </footer>
  );
}
