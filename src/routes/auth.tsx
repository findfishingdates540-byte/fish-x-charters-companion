import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import julianne from "@/assets/rev-julianne.png.asset.json";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional(),
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Fish-X Charters" },
      { name: "description", content: "Sign in or create an account on Fish-X Charters." },
    ],
  }),
  validateSearch: searchSchema,
  ssr: false,
  beforeLoad: async ({ search }) => {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      throw redirect({ to: search.redirect ?? "/dashboard" });
    }
  },
  component: AuthPage,
});

const p = {
  serif: "'Cormorant Garamond', Georgia, serif",
  sans: "'Hanken Grotesk', system-ui, sans-serif",
  ink: "#0d2236",
  navy: "#0a2236",
  navyDeep: "#06151f",
  paper: "#f4f6f8",
  paper2: "#e9edf1",
  sand: "#e3c089",
  goldtext: "#b88c46",
  ond: "#eaf1f6",
  ondmut: "#9bb0c0",
  tmut: "#5c6b78",
  line: "rgba(13,34,54,.10)",
  lined: "rgba(255,255,255,.13)",
};

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">(search.mode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [fullName, setFullName] = useState("");
  const [joinAs, setJoinAs] = useState<"angler" | "captain">("angler");
  const [keep, setKeep] = useState(false);
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setMode(search.mode ?? "signin"); }, [search.mode]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (mode === "signup" && !agree) {
      setError("Please agree to the Terms and Privacy Policy to continue.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: fullName, display_name: fullName, joining_as: joinAs },
          },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: search.redirect ?? "/dashboard" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function oauth(provider: "google" | "apple") {
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/dashboard` },
      });
      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : "OAuth sign-in failed");
    }
  }

  const isSignup = mode === "signup";

  return (
    <div style={{ minHeight: "100vh", background: p.paper, color: p.ink, fontFamily: p.sans, display: "grid", gridTemplateColumns: "1fr 1fr" }} className="max-md:!grid-cols-1">
      <style>{`
        .fxa-input{width:100%;background:#fff;border:1px solid ${p.line};border-radius:12px;padding:15px 16px;font-family:${p.sans};font-size:15px;color:${p.ink};outline:none;transition:border-color .2s, box-shadow .2s}
        .fxa-input:focus{border-color:${p.sand};box-shadow:0 0 0 4px rgba(227,192,137,.18)}
        .fxa-input::placeholder{color:#9aa6b1}
        .fxa-label{display:block;font-size:11px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:${p.tmut};margin-bottom:10px}
        .fxa-seg{position:relative;display:grid;grid-template-columns:1fr 1fr;background:${p.paper2};border:1px solid ${p.line};border-radius:999px;padding:6px}
        .fxa-seg button{position:relative;z-index:2;background:transparent;border:0;padding:14px 0;font-family:${p.sans};font-size:14px;font-weight:600;color:${p.tmut};cursor:pointer;border-radius:999px;transition:color .3s}
        .fxa-seg button[data-active="true"]{color:${p.ink}}
        .fxa-seg::before{content:"";position:absolute;top:6px;bottom:6px;left:6px;width:calc(50% - 6px);background:#fff;border-radius:999px;box-shadow:0 6px 18px -8px rgba(13,34,54,.3);transition:transform .35s cubic-bezier(.2,.7,.2,1)}
        .fxa-seg[data-pos="right"]::before{transform:translateX(100%)}
        .fxa-seg-sm{padding:5px}
        .fxa-seg-sm button{padding:12px 0;font-size:13.5px}
        .fxa-check{appearance:none;width:18px;height:18px;border:1.5px solid ${p.line};border-radius:4px;background:#fff;cursor:pointer;display:inline-grid;place-items:center;flex:none;transition:all .2s}
        .fxa-check:checked{background:${p.ink};border-color:${p.ink}}
        .fxa-check:checked::after{content:"";width:9px;height:5px;border-left:1.8px solid #fff;border-bottom:1.8px solid #fff;transform:rotate(-45deg) translate(1px,-1px)}
        .fxa-divider{display:flex;align-items:center;gap:14px;color:${p.tmut};font-size:11px;font-weight:700;letter-spacing:.22em;text-transform:uppercase}
        .fxa-divider::before,.fxa-divider::after{content:"";flex:1;height:1px;background:${p.line}}
        @keyframes fxa-rise{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .fxa-anim > *{animation:fxa-rise .35s both}
      `}</style>

      {/* Brand panel */}
      <aside style={{ position: "relative", overflow: "hidden", background: p.navy, color: p.ond, padding: "44px 64px 56px", display: "flex", flexDirection: "column", justifyContent: "space-between" }} className="max-md:!hidden">
        <div style={{ position: "absolute", top: -180, right: -140, width: 560, height: 560, background: "radial-gradient(circle, rgba(227,192,137,.10), rgba(227,192,137,0) 60%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(160deg, ${p.navy} 0%, ${p.navy} 55%, ${p.navyDeep} 100%)`, zIndex: -1 }} />

        {/* Top row: logo + Back to site */}
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: 12, textDecoration: "none", color: "#fff" }}>
            <span style={{ width: 12, height: 12, background: p.sand, transform: "rotate(45deg)", borderRadius: 1 }} />
            <span style={{ fontFamily: p.serif, fontWeight: 600, fontSize: 22, letterSpacing: ".02em" }}>Fish-X Charters</span>
          </Link>
          <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: p.ond, textDecoration: "none", fontSize: 13.5, fontWeight: 500, border: `1px solid ${p.lined}`, borderRadius: 999, padding: "10px 18px", background: "rgba(255,255,255,.03)" }}>
            ← Back to site
          </Link>
        </div>

        {/* Middle: heading + bullets */}
        <div style={{ position: "relative", maxWidth: 520 }}>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".24em", textTransform: "uppercase", color: p.sand }}>Members &amp; Captains</span>
          <h1 style={{ fontFamily: p.serif, fontWeight: 600, fontSize: "clamp(40px,4.6vw,62px)", lineHeight: 1.02, letterSpacing: "-.015em", margin: "20px 0 36px", color: "#fbfdff" }}>
            Charter the world's<br />finest waters.
          </h1>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 18 }}>
            {[
              "Licensed, background-checked captains",
              "Every payment held in secure escrow",
              "Free cancellation up to 48 hours",
            ].map((t) => (
              <li key={t} style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 15.5, color: p.ond }}>
                <span style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,.04)", border: `1px solid ${p.lined}`, display: "grid", placeItems: "center", color: p.sand, fontSize: 14, flex: "none" }}>✓</span>
                {t}
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom testimonial */}
        <figure style={{ position: "relative", margin: 0, background: "rgba(255,255,255,.04)", border: `1px solid ${p.lined}`, borderRadius: 16, padding: "24px 26px", backdropFilter: "blur(6px)", maxWidth: 560 }}>
          <div style={{ color: p.sand, fontSize: 14, letterSpacing: 3, marginBottom: 16 }}>★★★★★</div>
          <blockquote style={{ fontFamily: p.serif, fontStyle: "italic", fontSize: 19, lineHeight: 1.45, color: "#fff", margin: "0 0 22px", fontWeight: 500 }}>
            "An unforgettable day — and knowing the payment was protected made booking effortless."
          </blockquote>
          <figcaption style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <img src={julianne.url} alt="" style={{ width: 42, height: 42, borderRadius: "50%", objectFit: "cover", border: `1px solid ${p.lined}` }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>Julianne V.</div>
                <div style={{ fontSize: 12.5, color: p.ondmut }}>Booked in Porto Cervo</div>
              </div>
            </div>
            <div style={{ textAlign: "right", lineHeight: 1.1 }}>
              <div style={{ fontFamily: p.serif, fontSize: 26, fontWeight: 600, color: p.sand }}>4.96</div>
              <div style={{ fontSize: 10.5, color: p.ondmut, letterSpacing: ".08em" }}>avg rating</div>
            </div>
          </figcaption>
        </figure>
      </aside>

      {/* Form panel */}
      <main style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "48px 40px 56px", overflowY: "auto" }}>
        <div style={{ width: "100%", maxWidth: 460 }}>
          {/* Segmented toggle on top */}
          <div className="fxa-seg" data-pos={isSignup ? "right" : "left"} style={{ marginBottom: 40 }}>
            <button type="button" data-active={!isSignup} onClick={() => setMode("signin")}>Sign in</button>
            <button type="button" data-active={isSignup} onClick={() => setMode("signup")}>Create account</button>
          </div>

          <div className="fxa-anim" key={mode}>
            <h2 style={{ fontFamily: p.serif, fontWeight: 600, fontSize: 42, letterSpacing: "-.02em", lineHeight: 1.02, margin: "0 0 10px", color: p.ink }}>
              {isSignup ? "Create your account." : "Welcome back."}
            </h2>
            <p style={{ fontSize: 15.5, color: p.tmut, margin: "0 0 28px", lineHeight: 1.55 }}>
              {isSignup
                ? "Join Fish-X to book verified captains worldwide."
                : "Sign in to manage your charters and bookings."}
            </p>

            {/* OAuth buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <button type="button" onClick={() => oauth("apple")} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10, background: p.ink, color: "#fff", border: 0, borderRadius: 14, padding: "16px 22px", fontFamily: p.sans, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M16.365 1.43c0 1.14-.46 2.24-1.21 3.04-.81.86-2.12 1.5-3.21 1.41-.13-1.1.43-2.24 1.16-3.02.83-.88 2.22-1.52 3.26-1.43zM20.5 17.05c-.55 1.28-.82 1.85-1.54 2.99-1 1.58-2.4 3.55-4.13 3.57-1.55.01-1.95-1.01-4.05-1-2.1.01-2.54 1.02-4.09 1-1.74-.02-3.06-1.79-4.06-3.37C.45 16.36-.07 11.05 2.94 8.27c1.07-.99 2.5-1.62 4.05-1.64 1.59-.03 3.09 1.07 4.05 1.07.95 0 2.78-1.32 4.68-1.13.79.03 3.01.32 4.44 2.4-3.84 2.1-3.23 7.59.34 8.08z"/></svg>
                Continue with Apple
              </button>
              <button type="button" onClick={() => oauth("google")} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10, background: "#fff", color: p.ink, border: `1px solid ${p.line}`, borderRadius: 14, padding: "16px 22px", fontFamily: p.sans, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden><path fill="#4285F4" d="M22.5 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h5.92a5.07 5.07 0 0 1-2.2 3.32v2.77h3.56c2.08-1.92 3.28-4.74 3.28-8.33z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.77c-.99.66-2.25 1.06-3.72 1.06-2.86 0-5.29-1.93-6.15-4.53H2.18v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.85 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.35-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.94l3.67-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.07.56 4.21 1.65l3.16-3.16C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.67 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
                Continue with Google
              </button>
            </div>

            <div className="fxa-divider" style={{ margin: "26px 0 22px" }}>or with email</div>

            <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {isSignup && (
                <div>
                  <label className="fxa-label" htmlFor="fn">Full name</label>
                  <input id="fn" className="fxa-input" value={fullName} onChange={(e) => setFullName(e.target.value)} required autoComplete="name" placeholder="Alexander Sterling" />
                </div>
              )}
              <div>
                <label className="fxa-label" htmlFor="em">Email address</label>
                <input id="em" type="email" className="fxa-input" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="you@email.com" />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
                  <label className="fxa-label" htmlFor="pw" style={{ margin: 0 }}>Password</label>
                  {!isSignup && (
                    <a href="#" style={{ fontSize: 12.5, color: p.goldtext, textDecoration: "none", fontWeight: 600 }}>Forgot?</a>
                  )}
                </div>
                <div style={{ position: "relative" }}>
                  <input id="pw" type={showPw ? "text" : "password"} className="fxa-input" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8}
                         autoComplete={isSignup ? "new-password" : "current-password"} placeholder="••••••••" style={{ paddingRight: 70 }} />
                  <button type="button" onClick={() => setShowPw((v) => !v)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "transparent", border: 0, color: p.tmut, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    {showPw ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {isSignup ? (
                <>
                  <div>
                    <label className="fxa-label">I'm joining as</label>
                    <div className="fxa-seg fxa-seg-sm" data-pos={joinAs === "captain" ? "right" : "left"}>
                      <button type="button" data-active={joinAs === "angler"} onClick={() => setJoinAs("angler")}>An angler</button>
                      <button type="button" data-active={joinAs === "captain"} onClick={() => setJoinAs("captain")}>A captain</button>
                    </div>
                  </div>
                  <label style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13.5, color: p.tmut, cursor: "pointer", lineHeight: 1.5 }}>
                    <input type="checkbox" className="fxa-check" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ marginTop: 2 }} />
                    <span>
                      I agree to the{" "}
                      <a href="#" style={{ color: p.goldtext, textDecoration: "underline", textUnderlineOffset: 3 }}>Terms of Service</a>{" "}
                      and{" "}
                      <a href="#" style={{ color: p.goldtext, textDecoration: "underline", textUnderlineOffset: 3 }}>Privacy Policy</a>.
                    </span>
                  </label>
                </>
              ) : (
                <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5, color: p.tmut, cursor: "pointer" }}>
                  <input type="checkbox" className="fxa-check" checked={keep} onChange={(e) => setKeep(e.target.checked)} />
                  Keep me signed in
                </label>
              )}

              {error && (
                <div style={{ borderRadius: 12, background: "rgba(220,80,80,.08)", border: "1px solid rgba(220,80,80,.25)", padding: "12px 14px", fontSize: 13.5, color: "#a13030" }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                style={{
                  marginTop: 6,
                  background: p.sand,
                  color: "#1c1303",
                  border: 0,
                  borderRadius: 14,
                  padding: "18px 24px",
                  fontFamily: p.sans,
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: ".18em",
                  textTransform: "uppercase",
                  cursor: busy ? "not-allowed" : "pointer",
                  opacity: busy ? 0.65 : 1,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                }}
              >
                {busy ? "Please wait…" : isSignup ? "Create account →" : "Sign in →"}
              </button>
            </form>

            <p style={{ marginTop: 26, fontSize: 13.5, color: p.tmut, textAlign: "center" }}>
              {isSignup ? "Already have an account? " : "New to Fish-X? "}
              <button onClick={() => setMode(isSignup ? "signin" : "signup")} style={{ background: "none", border: 0, color: p.ink, fontWeight: 700, cursor: "pointer", padding: 0, textDecoration: "underline", textUnderlineOffset: 4 }}>
                {isSignup ? "Sign in" : "Create an account"}
              </button>
            </p>

            <p style={{ marginTop: 18, fontSize: 12.5, color: p.tmut, textAlign: "center", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, width: "100%" }}>
              <span aria-hidden>🔒</span> Secured with bank-level encryption
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
