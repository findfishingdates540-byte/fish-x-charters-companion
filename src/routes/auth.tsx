import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional(),
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Captain sign in — Fish-X Charters" },
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
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-10">
          <span className="material-symbols-outlined text-sandy-gold">anchor</span>
          <span className="text-label-caps">Fish-X Charters</span>
        </Link>

        <div className="glass-card p-8">
          <h1 className="text-display text-3xl">
            {mode === "signup" ? "Captain your business" : "Welcome aboard, Captain"}
          </h1>
          <p className="mt-2 text-sm text-on-deep-muted">
            {mode === "signup"
              ? "Create a captain account to start taking bookings."
              : "Sign in to manage your trips and bookings."}
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            {mode === "signup" && (
              <>
                <Field label="Full name" value={fullName} onChange={setFullName} required autoComplete="name" />
                <Field label="Phone" type="tel" value={phone} onChange={setPhone} autoComplete="tel" />
              </>
            )}
            <Field label="Email" type="email" value={email} onChange={setEmail} required autoComplete="email" />
            <Field label="Password" type="password" value={password} onChange={setPassword} required minLength={8}
                   autoComplete={mode === "signup" ? "new-password" : "current-password"} />

            {error && (
              <div className="rounded-lg border border-soft-coral/30 bg-soft-coral/10 px-4 py-3 text-sm text-on-deep">
                {error}
              </div>
            )}

            <button type="submit" disabled={busy} className="btn-gold btn-gold-hover w-full disabled:opacity-60">
              {busy ? "…" : mode === "signup" ? "Create captain account" : "Sign in"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-on-deep-muted">
            {mode === "signup" ? (
              <>Already a captain?{" "}
                <button onClick={() => setMode("signin")} className="text-sandy-gold hover:underline">Sign in</button>
              </>
            ) : (
              <>New to Fish-X Charters?{" "}
                <button onClick={() => setMode("signup")} className="text-sandy-gold hover:underline">Create account</button>
              </>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-on-deep-muted">
          By continuing you agree to our terms and privacy policy.
        </p>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", required, autoComplete, minLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  minLength?: number;
}) {
  return (
    <label className="block">
      <span className="text-label-caps text-on-deep-muted">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoComplete={autoComplete}
        minLength={minLength}
        className="mt-2 block w-full rounded-lg border border-border bg-white/5 px-4 py-3 text-on-deep placeholder:text-on-deep-muted focus:border-sandy-gold focus:outline-none focus:ring-2 focus:ring-sandy-gold/30 transition"
      />
    </label>
  );
}
