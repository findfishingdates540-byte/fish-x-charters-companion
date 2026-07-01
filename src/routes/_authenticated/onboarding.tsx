import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery, queryOptions, useQueryClient } from "@tanstack/react-query";
import { getMyBusinesses, createBusiness } from "@/lib/my-businesses.functions";
import { listCategories } from "@/lib/businesses.functions";

const myBusinessesQO = queryOptions({
  queryKey: ["my-businesses"],
  queryFn: () => getMyBusinesses(),
});
const categoriesQO = queryOptions({
  queryKey: ["business-categories"],
  queryFn: () => listCategories(),
});

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Set up your business — Fish-X" }] }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(myBusinessesQO),
      context.queryClient.ensureQueryData(categoriesQO),
    ]);
  },
  component: OnboardingPage,
  errorComponent: ({ error }) => <div className="p-10">Error: {error.message}</div>,
  notFoundComponent: () => <div className="p-10">Not found.</div>,
});

function OnboardingPage() {
  const { data: mine } = useSuspenseQuery(myBusinessesQO);
  const { data: categories } = useSuspenseQuery(categoriesQO);
  const navigate = useNavigate();
  const router = useRouter();
  const qc = useQueryClient();
  const createFn = useServerFn(createBusiness);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [categoryKey, setCategoryKey] = useState<string>(categories[0]?.key ?? "charter");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [tagline, setTagline] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (mine.length > 0) {
    return (
      <div className="p-10 max-w-2xl">
        <h1 className="text-display text-4xl mb-4">You already run a business</h1>
        <p className="text-on-deep-muted mb-6">You're a member of {mine.length} business{mine.length > 1 ? "es" : ""}.</p>
        <ul className="space-y-3">
          {mine.map((m) => (
            <li key={m.business?.id ?? Math.random()} className="glass-card p-4 flex items-center justify-between">
              <div>
                <div className="font-semibold">{m.business?.name}</div>
                <div className="text-sm text-on-deep-muted">{m.role}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  async function next() {
    setError(null);
    if (step === 1) return setStep(2);
    if (step === 2) {
      if (!name || !slug) return setError("Name and URL slug are required.");
      return setStep(3);
    }
    setBusy(true);
    try {
      const b = await createFn({
        data: { name, slug, categoryKey, tagline, city, country },
      });
      await qc.invalidateQueries({ queryKey: ["my-businesses"] });
      router.invalidate();
      navigate({ to: "/dashboard" });
      void b;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create business");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-10 max-w-2xl mx-auto">
      <p className="text-label-caps text-sandy-gold">Step {step} of 3</p>
      <h1 className="text-display text-4xl mt-2 mb-8">
        {step === 1 && "What kind of operator are you?"}
        {step === 2 && "Name your business"}
        {step === 3 && "Where are you based?"}
      </h1>

      {step === 1 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {categories.map((c) => (
            <button
              key={c.key}
              onClick={() => setCategoryKey(c.key)}
              className={`glass-card p-4 text-left ${categoryKey === c.key ? "ring-2 ring-sandy-gold" : ""}`}
            >
              <div className="text-sm font-semibold">{c.label}</div>
            </button>
          ))}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <label className="block">
            <span className="text-label-caps">Business name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-2 w-full rounded-lg border border-border bg-card p-3" placeholder="Blue Water Charters" />
          </label>
          <label className="block">
            <span className="text-label-caps">URL slug</span>
            <input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} className="mt-2 w-full rounded-lg border border-border bg-card p-3 font-mono" placeholder="blue-water-charters" />
          </label>
          <label className="block">
            <span className="text-label-caps">Tagline (optional)</span>
            <input value={tagline} onChange={(e) => setTagline(e.target.value)} className="mt-2 w-full rounded-lg border border-border bg-card p-3" placeholder="Half-day and full-day offshore trips" />
          </label>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <label className="block">
            <span className="text-label-caps">City</span>
            <input value={city} onChange={(e) => setCity(e.target.value)} className="mt-2 w-full rounded-lg border border-border bg-card p-3" />
          </label>
          <label className="block">
            <span className="text-label-caps">Country</span>
            <input value={country} onChange={(e) => setCountry(e.target.value)} className="mt-2 w-full rounded-lg border border-border bg-card p-3" />
          </label>
        </div>
      )}

      {error && <div className="mt-4 text-soft-coral text-sm">{error}</div>}

      <div className="mt-8 flex gap-3">
        {step > 1 && (
          <button onClick={() => setStep((s) => (s - 1) as 1 | 2)} className="px-6 py-3 rounded-lg border border-border">Back</button>
        )}
        <button onClick={next} disabled={busy} className="px-6 py-3 rounded-lg bg-sandy-gold text-black font-semibold">
          {busy ? "Creating…" : step === 3 ? "Create business" : "Continue"}
        </button>
      </div>
    </div>
  );
}
