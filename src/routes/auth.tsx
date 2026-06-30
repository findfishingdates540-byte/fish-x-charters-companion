import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import julianne from "@/assets/rev-julianne.png.asset.json";
import seascape from "@/assets/seascape.jpg.asset.json";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional(),
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Fish-X Charters" },
      { name: "description", content: "Sign in or create a captain account on Fish-X Charters." },
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
  deep: "#06151f",
  paper: "#f4f6f8",
  paper2: "#e9edf1",
  card: "#ffffff",
  sand: "#e3c089",
  goldtext: "#b88c46",
  ond: "#eaf1f6",
  ondmut: "#9bb0c0",
  tmut: "#5c6b78",
  line: "rgba(13,34,54,.10)",
  lined: "rgba(255,255,255,.13)",
  cyan: "#27c0e2",
};

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">(search.mode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setMode(search.mode ?? "signin"); }, [search.mode]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: fullName, phone, display_name: fullName },
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

  return (
    <div style={{ minHeight: "100vh", background: p.paper, color: p.ink, fontFamily: p.sans, display: "grid", gridTemplateColumns: "1.05fr 1fr" }} className="max-md:!grid-cols-1">
      <style>{`
        .fxa-input{width:100%;background:#fff;border:1px solid ${p.line};border-radius:12px;padding:14px 16px;font-family:${p.sans};font-size:15px;color:${p.ink};outline:none;transition:border-color .2s, box-shadow .2s}
        .fxa-input:focus{border-color:${p.sand};box-shadow:0 0 0 4px rgba(227,192,137,.18)}
        .fxa-label{display:block;font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:${p.tmut};margin-bottom:8px}
        .fxa-seg{position:relative;display:grid;grid-template-columns:1fr 1fr;background:${p.paper2};border:1px solid ${p.line};border-radius:14px;padding:5px;margin-bottom:32px}
        .fxa-seg button{position:relative;z-index:2;background:transparent;border:0;padding:11px 0;font-family:${p.sans};font-size:12.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${p.tmut};cursor:pointer;border-radius:10px;transition:color .3s}
        .fxa-seg button[data-active="true"]{color:${p.ink}}
        .fxa-seg::before{content:"";position:absolute;top:5px;bottom:5px;left:5px;width:calc(50% - 5px);background:#fff;border-radius:10px;box-shadow:0 4px 14px -6px rgba(13,34,54,.25);transition:transform .35s cubic-bezier(.2,.7,.2,1)}
        .fxa-seg[data-mode="signup"]::before{transform:translateX(100%)}
        @keyframes fxa-rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .fxa-form > *{animation:fxa-rise .45s both}
      `}</style>

      {/* Brand panel */}
      <aside style={{ position: "relative", overflow: "hidden", background: p.navy, color: p.ond, padding: "44px 56px", display: "flex", flexDirection: "column", justifyContent: "space-between" }} className="max-md:!hidden">
        <img src={seascape.url} alt="" aria-hidden style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 38%", opacity: 0.32 }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(165deg,rgba(10,34,54,.95) 8%,rgba(10,34,54,.78) 50%,rgba(6,21,31,.92) 100%)" }} />
        <div style={{ position: "absolute", top: -160, right: -120, width: 520, height: 520, background: "radial-gradient(circle, rgba(227,192,137,.14), rgba(227,192,137,0) 60%)" }} />

        <Link to="/" style={{ position: "relative", display: "flex", alignItems: "center", gap: 11, textDecoration: "none", color: "#fff" }}>
          <span style={{ width: 11, height: 11, background: p.sand, transform: "rotate(45deg)", display: "inline-block", borderRadius: 1 }} />
          <span style={{ fontFamily: p.serif, fontWeight: 600, fontSize: 21, letterSpacing: ".02em" }}>Fish-X Charters</span>
        </Link>

        <div style={{ position: "relative", maxWidth: 460 }}>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".22em", textTransform: "uppercase", color: p.sand }}>Welcome aboard</span>
          <h1 style={{ fontFamily: p.serif, fontWeight: 600, fontSize: "clamp(36px,4vw,52px)", lineHeight: 1.05, letterSpacing: "-.015em", margin: "16px 0 18px", color: "#fbfdff" }}>
            Run your charter business <span style={{ fontStyle: "italic", color: p.sand }}>from the helm.</span>
          </h1>
          <p style={{ fontSize: 16.5, lineHeight: 1.6, color: p.ondmut, margin: 0 }}>
            Manage bookings, trips, customers and payouts in one place — backed by Fish-X escrow and a worldwide angler network.
          </p>
        </div>

        <figure style={{ position: "relative", margin: 0, background: "rgba(255,255,255,.05)", border: `1px solid ${p.lined}`, borderRadius: 18, padding: "22px 24px", backdropFilter: "blur(6px)", maxWidth: 460 }}>
          <div style={{ color: p.sand, fontSize: 14, letterSpacing: 2, marginBottom: 10 }}>★★★★★</div>
          <blockquote style={{ fontFamily: p.serif, fontStyle: "italic", fontSize: 18, lineHeight: 1.45, color: "#fff", margin: "0 0 16px" }}>
            "Bookings, payouts, customer notes — it all just runs. I haven't chased a deposit in nine months."
          </blockquote>
          <figcaption style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src={julianne.url} alt="" style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", border: `1px solid ${p.lined}` }} />
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: "#fff" }}>Capt. Julianne V.</div>
              <div style={{ fontSize: 12, color: p.ondmut }}>Porto Cervo · Operator on Fish-X</div>
            </div>
          </figcaption>
        </figure>
      </aside>

      {/* Form panel */}
      <main style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "56px 32px" }}>
        <div style={{ width: "100%", maxWidth: 440 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 36 }}>
            <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: p.tmut, textDecoration: "none", fontSize: 13, fontWeight: 600 }}>
              ← Back home
            </Link>
            <span style={{ fontSize: 12, color: p.tmut }}>
              {mode === "signup" ? "Have an account?" : "New here?"}{" "}
              <button onClick={() => setMode(mode === "signup" ? "signin" : "signup")} style={{ background: "none", border: 0, color: p.goldtext, fontWeight: 700, cursor: "pointer", padding: 0 }}>
                {mode === "signup" ? "Sign in" : "Create one"}
              </button>
            </span>
          </div>

          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".22em", textTransform: "uppercase", color: p.goldtext }}>
            {mode === "signup" ? "Captain account" : "Captain sign in"}
          </span>
          <h2 style={{ fontFamily: p.serif, fontWeight: 600, fontSize: 38, letterSpacing: "-.015em", lineHeight: 1.05, margin: "12px 0 10px", color: p.ink }}>
            {mode === "signup" ? "Cast off with Fish-X." : "Welcome back, Captain."}
          </h2>
          <p style={{ fontSize: 15, color: p.tmut, margin: "0 0 30px", lineHeight: 1.55 }}>
            {mode === "signup"
              ? "Create your operator account to list boats, take bookings and get paid via escrow."
              : "Sign in to manage today's trips, customers and payouts."}
          </p>

          <div className="fxa-seg" data-mode={mode}>
            <button data-active={mode === "signin"} onClick={() => setMode("signin")} type="button">Sign in</button>
            <button data-active={mode === "signup"} onClick={() => setMode("signup")} type="button">Create account</button>
          </div>

          <form onSubmit={onSubmit} className="fxa-form" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {mode === "signup" && (
              <>
                <div>
                  <label className="fxa-label" htmlFor="fn">Full name</label>
                  <input id="fn" className="fxa-input" value={fullName} onChange={(e) => setFullName(e.target.value)} required autoComplete="name" placeholder="Capt. Alessandro Greco" />
                </div>
                <div>
                  <label className="fxa-label" htmlFor="ph">Phone</label>
                  <input id="ph" type="tel" className="fxa-input" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" placeholder="+1 555 000 0000" />
                </div>
              </>
            )}
            <div>
              <label className="fxa-label" htmlFor="em">Email</label>
              <input id="em" type="email" className="fxa-input" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="captain@yourboat.com" />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                <label className="fxa-label" htmlFor="pw">Password</label>
                {mode === "signin" && (
                  <a href="#" style={{ fontSize: 11, color: p.goldtext, textDecoration: "none", fontWeight: 600 }}>Forgot?</a>
                )}
              </div>
              <input id="pw" type="password" className="fxa-input" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8}
                     autoComplete={mode === "signup" ? "new-password" : "current-password"} placeholder="At least 8 characters" />
            </div>

            {error && (
              <div style={{ borderRadius: 12, background: "rgba(220,80,80,.08)", border: "1px solid rgba(220,80,80,.25)", padding: "12px 14px", fontSize: 13.5, color: "#a13030" }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              style={{
                position: "relative",
                marginTop: 6,
                background: p.ink,
                color: "#fff",
                border: 0,
                borderRadius: 40,
                padding: "16px 24px",
                fontFamily: p.sans,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: ".1em",
                textTransform: "uppercase",
                cursor: busy ? "not-allowed" : "pointer",
                opacity: busy ? 0.65 : 1,
                transition: "transform .2s, box-shadow .2s",
              }}
            >
              {busy ? "Please wait…" : mode === "signup" ? "Create captain account →" : "Sign in →"}
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 12, color: p.tmut, fontSize: 11, fontWeight: 600, letterSpacing: ".18em", textTransform: "uppercase", margin: "6px 0" }}>
              <span style={{ flex: 1, height: 1, background: p.line }} />
              or
              <span style={{ flex: 1, height: 1, background: p.line }} />
            </div>

            <button type="button" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10, background: "#fff", border: `1px solid ${p.line}`, borderRadius: 40, padding: "14px 22px", fontFamily: p.sans, fontSize: 13.5, fontWeight: 600, color: p.ink, cursor: "pointer" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden><path fill="#4285F4" d="M22.5 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h5.92a5.07 5.07 0 0 1-2.2 3.32v2.77h3.56c2.08-1.92 3.28-4.74 3.28-8.33z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.77c-.99.66-2.25 1.06-3.72 1.06-2.86 0-5.29-1.93-6.15-4.53H2.18v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.85 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.35-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.94l3.67-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.07.56 4.21 1.65l3.16-3.16C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.67 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
              Continue with Google
            </button>
          </form>

          <p style={{ marginTop: 28, fontSize: 12, color: p.tmut, lineHeight: 1.55, textAlign: "center" }}>
            By continuing you agree to the Fish-X Charters{" "}
            <a href="#" style={{ color: p.ink, textDecoration: "underline", textUnderlineOffset: 3 }}>Terms</a> and{" "}
            <a href="#" style={{ color: p.ink, textDecoration: "underline", textUnderlineOffset: 3 }}>Privacy Policy</a>.
          </p>
        </div>
      </main>
    </div>
  );
}
