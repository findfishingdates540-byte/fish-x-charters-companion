import { createFileRoute, Link } from "@tanstack/react-router";
import heroImg from "@/assets/story-hero.jpg";
import teamImg from "@/assets/story-team.jpg";
import helmImg from "@/assets/story-helm.jpg";

export const Route = createFileRoute("/brand-story")({
  component: BrandStoryPage,
  head: () => ({
    meta: [
      { title: "Our Story | Fish-X Charters" },
      {
        name: "description",
        content:
          "The Fish-X story — how a marketplace built by captains and anglers is redefining the sport-fishing charter industry.",
      },
      { property: "og:title", content: "Our Story | Fish-X Charters" },
      {
        property: "og:description",
        content:
          "Built by captains and anglers — the Fish-X story, values, and the crew behind the marketplace.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: heroImg },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: heroImg },
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
  ["--goldtext" as never]: "#b88c46",
  ["--tmut" as never]: "#5c6b78",
  ["--ond" as never]: "#eaf1f6",
  ["--ondmut" as never]: "#9bb0c0",
  ["--line" as never]: "rgba(13,34,54,.10)",
  background: "var(--paper)",
  color: "var(--ink)",
  fontFamily: "var(--sans)",
  overflowX: "hidden",
};

const STATS = [
  { n: "10+", l: "Years On The Water" },
  { n: "800+", l: "Verified Captains" },
  { n: "45k", l: "Trips Booked" },
  { n: "12", l: "Coastal Regions" },
];

const VALUES = [
  {
    icon: "⚓",
    title: "Steadfast Integrity",
    body:
      "Transparent pricing, escrow-secured deposits, and an unwavering commitment to safety at sea.",
  },
  {
    icon: "🧭",
    title: "Captain First",
    body:
      "We build the tools captains actually want — fair terms, direct payouts, and no gatekeeping on their own repeat clients.",
  },
  {
    icon: "🎖",
    title: "Craft & Standards",
    body:
      "Every listing on Fish-X is vetted for licensing, insurance, and on-water experience before it goes live.",
  },
];

function BrandStoryPage() {
  return (
    <div style={TOKENS}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Hanken+Grotesk:wght@300;400;500;600;700&display=swap');
        .bs-serif{font-family:var(--serif)}
        .bs-eyebrow{font-size:11px;letter-spacing:.32em;text-transform:uppercase;font-weight:600}
        .bs-reveal{opacity:0;transform:translateY(20px);animation:bs-rise .9s cubic-bezier(.22,1,.36,1) forwards}
        @keyframes bs-rise{to{opacity:1;transform:translateY(0)}}
        .bs-btn{display:inline-flex;align-items:center;justify-content:center;padding:14px 32px;border-radius:999px;font-size:12px;letter-spacing:.24em;text-transform:uppercase;font-weight:600;transition:transform .2s ease, opacity .2s ease}
        .bs-btn:active{transform:scale(.97)}
        .bs-btn-primary{background:var(--sand);color:#3a2a10}
        .bs-btn-primary:hover{opacity:.9}
        .bs-btn-ghost{border:1px solid var(--ink);color:var(--ink)}
        .bs-btn-ghost:hover{background:var(--ink);color:var(--paper)}
        .bs-nav a{font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:var(--tmut);transition:color .2s}
        .bs-nav a:hover{color:var(--ink)}
        .bs-nav a.active{color:var(--goldtext);border-bottom:1px solid var(--goldtext);padding-bottom:4px}
      `}</style>

      {/* Nav */}
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          background: "rgba(244,246,248,.72)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          borderBottom: "1px solid var(--line)",
          height: 76,
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "0 24px",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Link to="/" className="bs-serif" style={{ fontSize: 28, letterSpacing: "-.02em", color: "var(--ink)", fontWeight: 600 }}>
            Fish-X Charters
          </Link>
          <nav className="bs-nav" style={{ display: "flex", gap: 32, alignItems: "center" }}>
            <Link to="/discover">Charters</Link>
            <Link to="/how-it-works">How It Works</Link>
            <Link to="/brand-story" className="active">Our Story</Link>
            <Link to="/trust">Trust</Link>
            <Link to="/become-a-captain">For Captains</Link>
          </nav>
          <Link to="/discover" className="bs-btn bs-btn-primary" style={{ padding: "10px 22px" }}>
            Book A Trip
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section style={{ position: "relative", height: "100vh", minHeight: 620, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        <img
          src={heroImg}
          alt="Sport-fishing yacht at sunset"
          width={1920}
          height={1280}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transform: "scale(1.05)" }}
        />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(6,21,31,.55), rgba(10,34,54,.15) 60%, rgba(6,21,31,.7))" }} />
        <div style={{ position: "relative", zIndex: 2, textAlign: "center", padding: "0 20px", maxWidth: 900 }}>
          <span className="bs-eyebrow bs-reveal" style={{ color: "var(--sand)", display: "block", marginBottom: 24, letterSpacing: ".4em" }}>
            Established 2016
          </span>
          <h1
            className="bs-serif bs-reveal"
            style={{
              fontSize: "clamp(44px,7vw,92px)",
              lineHeight: 1.02,
              letterSpacing: "-.02em",
              color: "#fbfdff",
              fontWeight: 500,
              animationDelay: ".15s",
              textShadow: "0 2px 40px rgba(0,0,0,.4)",
            }}
          >
            The Fish-X <em style={{ color: "var(--sand)", fontStyle: "italic" }}>story</em>.
          </h1>
          <p className="bs-reveal" style={{ marginTop: 20, fontSize: 18, color: "rgba(255,255,255,.82)", maxWidth: 620, marginLeft: "auto", marginRight: "auto", animationDelay: ".3s" }}>
            Built by captains and anglers who were tired of watching legacy platforms take the deck.
          </p>
        </div>
      </section>

      {/* Narrative */}
      <section style={{ padding: "120px 24px", background: "var(--paper)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(12,1fr)", gap: 24 }}>
          <div style={{ gridColumn: "2 / span 6" }} className="bs-story-col">
            <span className="bs-eyebrow" style={{ color: "var(--goldtext)" }}>Our Origin</span>
            <h2 className="bs-serif" style={{ fontSize: "clamp(32px,4vw,48px)", lineHeight: 1.15, marginTop: 12, marginBottom: 24, letterSpacing: "-.01em" }}>
              Refining the horizon of sport-fishing.
            </h2>
            <p style={{ fontSize: 18, lineHeight: 1.7, color: "var(--tmut)", marginBottom: 20 }}>
              Fish-X was founded by working captains and lifelong anglers who saw the same problem from both sides of the transom: booking a real charter shouldn't feel like a lottery, and running one shouldn't mean handing over your best clients to a platform.
            </p>
            <p style={{ fontSize: 18, lineHeight: 1.7, color: "var(--tmut)" }}>
              We're not a directory. We're a marketplace with escrow-secured deposits, verified captains, and a bias for the crews doing this the right way — safely, professionally, and with genuine respect for the water.
            </p>
          </div>
          <div style={{ gridColumn: "9 / span 4", display: "flex", alignItems: "center" }} className="bs-quote-col">
            <div style={{ borderLeft: "1px solid var(--line)", paddingLeft: 32, paddingTop: 16, paddingBottom: 16 }}>
              <blockquote className="bs-serif" style={{ fontSize: 26, lineHeight: 1.35, fontStyle: "italic", color: "rgba(13,34,54,.55)", marginBottom: 16 }}>
                “The sea, once it casts its spell, holds one in its net of wonder forever.”
              </blockquote>
              <cite className="bs-eyebrow" style={{ color: "var(--ink)", fontStyle: "normal" }}>— Jacques Cousteau</cite>
            </div>
          </div>
        </div>
        <style>{`
          @media (max-width: 900px){
            .bs-story-col{grid-column:1 / -1 !important}
            .bs-quote-col{grid-column:1 / -1 !important;margin-top:24px}
          }
        `}</style>
      </section>

      {/* Stats */}
      <section style={{ background: "var(--navy)", padding: "56px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 24 }} className="bs-stats">
          {STATS.map((s, i) => (
            <div
              key={s.l}
              style={{
                textAlign: "center",
                padding: "0 12px",
                borderRight: i < STATS.length - 1 ? "1px solid rgba(255,255,255,.10)" : "none",
              }}
            >
              <div className="bs-serif" style={{ fontSize: 44, color: "var(--sand)", lineHeight: 1, marginBottom: 8, letterSpacing: "-.02em" }}>
                {s.n}
              </div>
              <div className="bs-eyebrow" style={{ color: "var(--ondmut)" }}>{s.l}</div>
            </div>
          ))}
        </div>
        <style>{`@media (max-width:800px){.bs-stats{grid-template-columns:repeat(2,1fr) !important}.bs-stats > div{border-right:none !important}}`}</style>
      </section>

      {/* Team imagery grid */}
      <section style={{ padding: "120px 24px", background: "var(--paper)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(12,1fr)", gap: 32, alignItems: "end" }} className="bs-team-grid">
            <div style={{ gridColumn: "1 / span 7" }} className="bs-team-a">
              <div style={{ borderRadius: 20, overflow: "hidden", boxShadow: "0 30px 80px -30px rgba(6,21,31,.35)" }}>
                <img src={teamImg} alt="Fish-X captain crew" width={1600} height={1000} loading="lazy" style={{ width: "100%", height: "auto", display: "block", aspectRatio: "16 / 10", objectFit: "cover" }} />
              </div>
            </div>
            <div style={{ gridColumn: "9 / span 4" }} className="bs-team-b">
              <div style={{ marginBottom: 48 }}>
                <span className="bs-eyebrow" style={{ color: "var(--goldtext)" }}>The Collective</span>
                <h3 className="bs-serif" style={{ fontSize: 34, lineHeight: 1.2, marginTop: 10, marginBottom: 16, letterSpacing: "-.01em" }}>
                  A crew of captains, anglers &amp; builders.
                </h3>
                <p style={{ fontSize: 16, lineHeight: 1.7, color: "var(--tmut)" }}>
                  Veteran skippers, tournament anglers, and product people who share one goal: raise the standard for how sport-fishing trips are booked, paid for, and delivered.
                </p>
              </div>
              <div style={{ borderRadius: 20, overflow: "hidden", boxShadow: "0 20px 60px -25px rgba(6,21,31,.35)" }}>
                <img src={helmImg} alt="Fish-X helm station" width={1200} height={1200} loading="lazy" style={{ width: "100%", height: "auto", display: "block", aspectRatio: "1 / 1", objectFit: "cover" }} />
              </div>
            </div>
          </div>
        </div>
        <style>{`
          @media (max-width:900px){
            .bs-team-grid{grid-template-columns:1fr !important}
            .bs-team-a,.bs-team-b{grid-column:1 / -1 !important}
          }
        `}</style>
      </section>

      {/* Values */}
      <section style={{ padding: "96px 24px", background: "var(--paper2)", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <span className="bs-eyebrow" style={{ color: "var(--goldtext)" }}>Our Philosophy</span>
            <h2 className="bs-serif" style={{ fontSize: "clamp(30px,3.6vw,44px)", marginTop: 14, letterSpacing: "-.01em" }}>
              The Fish-X anchors.
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 48 }} className="bs-values">
            {VALUES.map((v) => (
              <div key={v.title} style={{ textAlign: "center", padding: "0 12px" }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", border: "1px solid var(--line)", background: "var(--card)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", fontSize: 26 }}>
                  {v.icon}
                </div>
                <h4 className="bs-eyebrow" style={{ color: "var(--ink)", marginBottom: 14 }}>{v.title}</h4>
                <p style={{ fontSize: 15, lineHeight: 1.65, color: "var(--tmut)" }}>{v.body}</p>
              </div>
            ))}
          </div>
        </div>
        <style>{`@media (max-width:800px){.bs-values{grid-template-columns:1fr !important;gap:32px !important}}`}</style>
      </section>

      {/* CTA */}
      <section style={{ padding: "120px 24px", background: "var(--paper)" }}>
        <div style={{ maxWidth: 820, margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontSize: 42, marginBottom: 20, color: "var(--sand)" }}>⛵</div>
          <h2 className="bs-serif" style={{ fontSize: "clamp(32px,4.5vw,56px)", lineHeight: 1.1, letterSpacing: "-.02em", marginBottom: 20 }}>
            Begin your next chapter.
          </h2>
          <p style={{ fontSize: 18, color: "var(--tmut)", marginBottom: 40, lineHeight: 1.6 }}>
            Whether you're booking your first offshore day or listing your boat with a marketplace that actually has your back — Fish-X is built for you.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
            <Link to="/discover" className="bs-btn bs-btn-primary">Find A Charter</Link>
            <Link to="/become-a-captain" className="bs-btn bs-btn-ghost">List Your Boat</Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: "var(--navy)", padding: "64px 24px", borderTop: "1px solid var(--line)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
          <div className="bs-serif" style={{ fontSize: 32, color: "var(--sand)", letterSpacing: "-.02em" }}>Fish-X</div>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 32 }}>
            <Link to="/trust" className="bs-eyebrow" style={{ color: "rgba(255,255,255,.55)" }}>Trust</Link>
            <Link to="/how-it-works" className="bs-eyebrow" style={{ color: "rgba(255,255,255,.55)" }}>How It Works</Link>
            <Link to="/become-a-captain" className="bs-eyebrow" style={{ color: "rgba(255,255,255,.55)" }}>For Captains</Link>
            <Link to="/brand-story" className="bs-eyebrow" style={{ color: "rgba(255,255,255,.55)" }}>Our Story</Link>
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", letterSpacing: ".08em" }}>
            © {new Date().getFullYear()} Fish-X Charters. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
