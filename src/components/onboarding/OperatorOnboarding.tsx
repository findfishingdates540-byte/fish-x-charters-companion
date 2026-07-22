import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  createVerificationUploadUrl,
  getOnboardingState,
  publishListing,
  savePayoutPreference,
  submitVerification,
  upsertBusinessProfile,
} from "@/lib/onboarding.functions";

type DocKey = "license" | "insurance" | "id";
const DOC_META: Record<DocKey, { title: string; desc: string }> = {
  license: { title: "Captain's license", desc: "USCG / national boating license" },
  insurance: { title: "Vessel insurance", desc: "Current liability coverage" },
  id: { title: "Government ID", desc: "Passport or driver's license" },
};

const STEPS = [
  { label: "Business profile", sub: "Who you are" },
  { label: "Verification", sub: "License & insurance" },
  { label: "Payouts", sub: "Get paid via escrow" },
  { label: "Your first listing", sub: "What you offer" },
  { label: "Review & publish", sub: "Go live" },
];

export function OperatorOnboarding() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const fetchState = useServerFn(getOnboardingState);
  const upsertProfile = useServerFn(upsertBusinessProfile);
  const createUpload = useServerFn(createVerificationUploadUrl);
  const submitVer = useServerFn(submitVerification);
  const savePayout = useServerFn(savePayoutPreference);
  const publish = useServerFn(publishListing);

  const { data, isLoading } = useQuery({
    queryKey: ["onboarding"],
    queryFn: () => fetchState(),
  });

  const [step, setStep] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<Record<DocKey, string | null>>({
    license: null,
    insurance: null,
    id: null,
  });
  const [payoutSchedule, setPayoutSchedule] = useState<"weekly" | "each">("weekly");
  const [published, setPublished] = useState(false);

  // Profile form
  const biz = data?.business;
  const [profile, setProfile] = useState({
    name: "",
    categoryKey: "charter",
    city: "",
    phone: "",
    description: "",
  });
  // Sync loaded business
  const loadedRef = useRef(false);
  if (biz && !loadedRef.current) {
    loadedRef.current = true;
    setProfile({
      name: biz.name ?? "",
      categoryKey: biz.category_key ?? "charter",
      city: biz.city ?? "",
      phone: biz.phone ?? "",
      description: biz.description ?? "",
    });
    if (biz.is_published) setPublished(true);
  }

  // Listing form
  const svc = data?.service;
  const [listing, setListing] = useState({
    title: "Offshore charter",
    kind: "charter" as const,
    durationMinutes: 480,
    capacity: 6,
    price: 850,
    inc: {
      tackle: true,
      bait: true,
      license: true,
      drinks: false,
      photos: true,
      cleaning: false,
    } as Record<string, boolean>,
  });
  const svcLoadedRef = useRef(false);
  if (svc && !svcLoadedRef.current) {
    svcLoadedRef.current = true;
    setListing((p) => ({
      ...p,
      title: svc.title,
      durationMinutes: svc.duration_minutes ?? 480,
      capacity: svc.capacity,
      price: Math.round((svc.base_price_cents ?? 0) / 100),
    }));
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }

  const profileM = useMutation({
    mutationFn: (v: typeof profile) => upsertProfile({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["onboarding"] });
      showToast("Profile saved");
      setStep(1);
    },
    onError: (e: any) => showToast(e?.message ?? "Failed to save"),
  });

  const publishM = useMutation({
    mutationFn: async () => {
      const docPaths = Object.values(uploaded).filter(Boolean) as string[];
      if (docPaths.length > 0 && !data?.verification) {
        await submitVer({ data: { docPaths } });
      }
      await savePayout({ data: { schedule: payoutSchedule } });
      return publish({
        data: {
          title: listing.title,
          kind: listing.kind,
          durationMinutes: listing.durationMinutes,
          capacity: listing.capacity,
          basePriceCents: Math.round(listing.price * 100),
          includes: Object.entries(listing.inc)
            .filter(([, v]) => v)
            .map(([k]) => k),
        },
      });
    },
    onSuccess: () => {
      setPublished(true);
      qc.invalidateQueries({ queryKey: ["onboarding"] });
    },
    onError: (e: any) => showToast(e?.message ?? "Publish failed"),
  });

  async function handleUpload(key: DocKey, file: File) {
    try {
      const { path, token } = await createUpload({ data: { docKey: key, filename: file.name } });
      const { error } = await supabase.storage.from("verification-docs").uploadToSignedUrl(path, token, file);
      if (error) throw error;
      setUploaded((p) => ({ ...p, [key]: path }));
      showToast("Document uploaded");
    } catch (e: any) {
      showToast(e?.message ?? "Upload failed");
    }
  }

  const uploadedCount = Object.values(uploaded).filter(Boolean).length + (data?.verification?.doc_urls?.length ? 3 : 0);
  const pct = published ? 100 : Math.round((step / 4) * 100);

  const categories = data?.categories ?? [];

  if (isLoading) {
    return <div className="min-h-screen grid place-items-center bg-[#eef2f5] text-[#5c6b78]">Loading…</div>;
  }

  return (
    <div
      className="dc-body min-h-screen flex bg-[#eef2f5] text-[#0d2236]"
      style={{
        fontFamily: "'Hanken Grotesk',system-ui,sans-serif",
      }}
    >
      {/* Sidebar */}
      <aside className="w-[300px] flex-none bg-[#0a2236] text-[#eaf1f6] flex flex-col p-[26px_24px] sticky top-0 h-screen">
        <div className="flex items-center gap-[10px] mb-[26px]">
          <span className="inline-block w-[11px] h-[11px] bg-[#e3c089] rotate-45" />
          <span
            className="font-semibold text-[20px] tracking-[0.1em]"
            style={{ fontFamily: "'Cormorant Garamond',Georgia,serif" }}
          >
            FISH—X
          </span>
        </div>
        <div
          className="font-semibold text-[24px] leading-[1.1] text-white"
          style={{ fontFamily: "'Cormorant Garamond',Georgia,serif" }}
        >
          Set up your
          <br />
          workspace
        </div>
        <div className="text-[13px] text-[#93a7b7] mt-2 mb-5">A few steps and you're taking bookings.</div>
        <div className="flex items-center gap-[10px] mb-6">
          <div className="flex-1 h-[6px] rounded-md bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-md bg-gradient-to-r from-[#e3c089] to-[#d2a566] transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[11.5px] font-bold text-[#e3c089]">
            {published ? "Complete" : `Step ${step + 1} / 5`}
          </span>
        </div>
        <nav className="flex flex-col gap-[2px]">
          {STEPS.map((s, i) => {
            const done = i < step || published;
            const current = i === step && !published;
            return (
              <button
                key={i}
                onClick={() => !published && setStep(i)}
                className="flex items-center gap-[13px] w-full border-0 rounded-xl p-3 cursor-pointer text-left transition-colors"
                style={{ background: current ? "rgba(227,192,137,.14)" : "transparent" }}
              >
                <span
                  className="w-7 h-7 rounded-full flex-none grid place-items-center text-[12px] font-bold border-2"
                  style={{
                    background: done || current ? "#e3c089" : "transparent",
                    borderColor: done || current ? "#e3c089" : "rgba(255,255,255,.2)",
                    color: done || current ? "#1c1303" : "#93a7b7",
                  }}
                >
                  {done ? "✓" : i + 1}
                </span>
                <span>
                  <span
                    className="block text-[13.5px] font-semibold"
                    style={{ color: current ? "#fff" : done ? "#eaf1f6" : "#93a7b7" }}
                  >
                    {s.label}
                  </span>
                  <span className="block text-[11.5px] text-[#93a7b7] opacity-70">{s.sub}</span>
                </span>
              </button>
            );
          })}
        </nav>
        <div className="mt-auto pt-6 text-[11.5px] text-[#93a7b7]">
          Need a hand?{" "}
          <a href="mailto:captains@fish-x.com" className="text-[#e3c089] underline">
            captains@fish-x.com
          </a>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col">
        <div className="flex-1 p-[56px_64px] max-w-[960px]">
          {published ? (
            <div className="min-h-[70vh] flex items-center justify-center">
              <div className="max-w-[520px] text-center">
                <div
                  className="w-[82px] h-[82px] rounded-full bg-[#e2f2ea] grid place-items-center text-[#1f8a5b] mx-auto mb-[22px] text-[36px]"
                >
                  ✓
                </div>
                <div className="text-[11px] font-bold tracking-[0.16em] uppercase text-[#a97e3c]">
                  You're live on Fish-X
                </div>
                <h1
                  className="font-semibold text-[38px] leading-[1.05] my-[10px] text-[#0d2236]"
                  style={{ fontFamily: "'Cormorant Garamond',Georgia,serif" }}
                >
                  Your listing is published.
                </h1>
                <p className="text-[15.5px] leading-[1.55] text-[#5c6b78] mb-[26px]">
                  Anglers can now find and book <b className="text-[#0d2236]">{listing.title}</b>. Payments arrive
                  protected in escrow — released to you after every trip.
                </p>
                <div className="flex gap-3 justify-center flex-wrap">
                  <button
                    onClick={() => navigate({ to: "/dashboard" })}
                    className="bg-[#0a2236] text-white rounded-xl px-6 py-3.5 text-[13px] font-bold tracking-[0.03em]"
                  >
                    Go to dashboard
                  </button>
                  {data?.business?.slug && (
                    <a
                      href={`/b/${data.business.slug}`}
                      className="border border-[#0d2236]/10 text-[#0d2236] rounded-xl px-6 py-3.5 text-[13px] font-semibold"
                    >
                      View live listing
                    </a>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              <StepHeader
                step={step}
                heading={
                  step === 0
                    ? "Your business profile"
                    : step === 1
                      ? "Get verified"
                      : step === 2
                        ? "Get paid through escrow"
                        : step === 3
                          ? "Create your first listing"
                          : "Review & publish"
                }
                sub={
                  step === 0
                    ? "Tell anglers who you are. You can refine this later."
                    : step === 1
                      ? "The gold seal on your listing. Anglers only book verified operators."
                      : step === 2
                        ? "Anglers pay upfront into escrow — you're paid after every trip."
                        : step === 3
                          ? "Publish one signature offering to open your calendar."
                          : "Confirm the details below and go live."
                }
              />

              {step === 0 && (
                <ProfileStep profile={profile} setProfile={setProfile} categories={categories} />
              )}
              {step === 1 && (
                <VerifyStep
                  uploaded={uploaded}
                  onUpload={handleUpload}
                  alreadySubmitted={!!data?.verification}
                />
              )}
              {step === 2 && (
                <PayoutsStep schedule={payoutSchedule} setSchedule={setPayoutSchedule} />
              )}
              {step === 3 && <ListingStep listing={listing} setListing={setListing} />}
              {step === 4 && (
                <ReviewStep
                  profile={profile}
                  listing={listing}
                  verifyStatus={
                    data?.verification
                      ? "✓ Submitted"
                      : uploadedCount > 0
                        ? `${Math.min(uploadedCount, 3)} of 3`
                        : "Not started"
                  }
                  payoutSchedule={payoutSchedule}
                />
              )}

              <div className="mt-10 flex items-center justify-between max-w-[720px]">
                <button
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                  disabled={step === 0}
                  className="text-[13px] font-semibold text-[#5c6b78] disabled:opacity-0"
                >
                  ← Back
                </button>
                <button
                  onClick={() => {
                    if (step === 0) {
                      profileM.mutate(profile);
                    } else if (step === 4) {
                      publishM.mutate();
                    } else {
                      setStep((s) => Math.min(4, s + 1));
                    }
                  }}
                  disabled={profileM.isPending || publishM.isPending}
                  className="bg-[#e3c089] text-[#1c1303] border-0 rounded-xl px-[26px] py-[13px] text-[13.5px] font-bold tracking-[0.04em] cursor-pointer disabled:opacity-60"
                >
                  {step === 4
                    ? publishM.isPending
                      ? "Publishing…"
                      : "Publish listing & go live"
                    : profileM.isPending
                      ? "Saving…"
                      : "Continue"}
                </button>
              </div>
            </>
          )}
        </div>
      </main>

      {toast && (
        <div className="fixed bottom-[88px] left-1/2 -translate-x-1/2 z-50 flex items-center gap-[11px] bg-[#0a2236] text-white border border-white/10 rounded-full px-[22px] py-[13px] shadow-2xl">
          <span className="w-[22px] h-[22px] rounded-full bg-[#1f8a5b] grid place-items-center text-[12px]">✓</span>
          <span className="text-[13.5px] font-semibold">{toast}</span>
        </div>
      )}
    </div>
  );
}

function StepHeader({ step, heading, sub }: { step: number; heading: string; sub: string }) {
  return (
    <div className="mb-8">
      <div className="text-[11px] font-bold tracking-[0.16em] uppercase text-[#a97e3c]">Step {step + 1} of 5</div>
      <h1
        className="font-semibold text-[34px] leading-[1.05] mt-2 mb-1.5 text-[#0d2236]"
        style={{ fontFamily: "'Cormorant Garamond',Georgia,serif" }}
      >
        {heading}
      </h1>
      <p className="text-[15px] text-[#5c6b78]">{sub}</p>
    </div>
  );
}

const inputCls =
  "w-full bg-[#eef2f5] border border-[#0d2236]/10 rounded-[10px] px-[13px] py-3 text-[14px] text-[#0d2236] outline-none focus:border-[#e3c089]";
const labelCls =
  "block text-[11px] font-bold tracking-[0.1em] uppercase text-[#5c6b78] mb-1.5";

function ProfileStep({
  profile,
  setProfile,
  categories,
}: {
  profile: any;
  setProfile: (v: any) => void;
  categories: { key: string; label: string }[];
}) {
  return (
    <div className="bg-white border border-[#0d2236]/10 rounded-[18px] p-6 max-w-[720px]">
      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className={labelCls}>Business name</span>
          <input
            value={profile.name}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            className={inputCls}
            placeholder="Sterling Sportfishing"
          />
        </label>
        <label className="block">
          <span className={labelCls}>Category</span>
          <select
            value={profile.categoryKey}
            onChange={(e) => setProfile({ ...profile, categoryKey: e.target.value })}
            className={inputCls}
          >
            {categories.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelCls}>Homeport</span>
          <input
            value={profile.city}
            onChange={(e) => setProfile({ ...profile, city: e.target.value })}
            className={inputCls}
            placeholder="Islamorada, FL"
          />
        </label>
        <label className="block">
          <span className={labelCls}>Phone</span>
          <input
            value={profile.phone}
            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
            className={inputCls}
            placeholder="+1 (305) 555-0147"
          />
        </label>
      </div>
      <label className="block mt-4">
        <span className={labelCls}>Short bio</span>
        <textarea
          value={profile.description}
          onChange={(e) => setProfile({ ...profile, description: e.target.value })}
          className={`${inputCls} min-h-[88px] resize-y`}
          placeholder="Tournament-grade offshore captain with 20+ years running…"
        />
      </label>
    </div>
  );
}

function VerifyStep({
  uploaded,
  onUpload,
  alreadySubmitted,
}: {
  uploaded: Record<DocKey, string | null>;
  onUpload: (k: DocKey, file: File) => void;
  alreadySubmitted: boolean;
}) {
  return (
    <div className="flex flex-col gap-[14px] max-w-[720px]">
      {(Object.keys(DOC_META) as DocKey[]).map((k) => {
        const meta = DOC_META[k];
        const done = !!uploaded[k] || alreadySubmitted;
        return (
          <div
            key={k}
            className="bg-white border border-[#0d2236]/10 rounded-2xl p-[18px_20px] flex items-center gap-4"
          >
            <span className="w-11 h-11 rounded-xl bg-[#f4e6cd] grid place-items-center text-[#a97e3c] flex-none">
              📄
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[14.5px] font-semibold text-[#0d2236]">{meta.title}</div>
              <div className="text-[12.5px] text-[#5c6b78]">{meta.desc}</div>
            </div>
            {done ? (
              <span className="inline-flex items-center gap-2 bg-[#e2f2ea] text-[#1f8a5b] rounded-full px-[14px] py-[9px] text-[12.5px] font-bold flex-none">
                <span className="w-4 h-4 rounded-full bg-[#1f8a5b] text-white grid place-items-center text-[10px]">
                  ✓
                </span>
                Uploaded
              </span>
            ) : (
              <label className="flex-none bg-[#0a2236] text-white border-0 rounded-[10px] px-[18px] py-[10px] text-[12.5px] font-bold cursor-pointer">
                Upload
                <input
                  type="file"
                  className="hidden"
                  accept="image/*,.pdf"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onUpload(k, f);
                    e.target.value = "";
                  }}
                />
              </label>
            )}
          </div>
        );
      })}
      <div className="flex items-start gap-2.5 bg-[#e2eef2] rounded-xl px-4 py-3.5 max-w-[720px] mt-2">
        <span className="text-[#1f9fbe] flex-none mt-0.5">ℹ</span>
        <span className="text-[12.5px] leading-[1.5] text-[#0d2236]">
          Documents are reviewed within ~24 hours. You can finish setup now — your listing goes live the moment
          verification clears.
        </span>
      </div>
    </div>
  );
}

function PayoutsStep({
  schedule,
  setSchedule,
}: {
  schedule: "weekly" | "each";
  setSchedule: (s: "weekly" | "each") => void;
}) {
  return (
    <>
      <div className="grid grid-cols-3 gap-[14px] max-w-[720px] mb-5">
        {[
          { n: 1, t: "Angler pays", d: "Funds captured at booking.", c: "#f4e6cd", ic: "#a97e3c" },
          { n: 2, t: "Held in escrow", d: "Safe — not your balance yet.", c: "#e2eef2", ic: "#1f9fbe" },
          { n: 3, t: "You're paid", d: "Released after the trip.", c: "#e2f2ea", ic: "#1f8a5b" },
        ].map((x) => (
          <div key={x.n} className="bg-white border border-[#0d2236]/10 rounded-2xl p-[18px]">
            <div
              className="w-[34px] h-[34px] rounded-[9px] grid place-items-center mb-3 font-semibold"
              style={{ background: x.c, color: x.ic, fontFamily: "'Cormorant Garamond',Georgia,serif" }}
            >
              {x.n}
            </div>
            <div className="text-[13.5px] font-semibold text-[#0d2236] mb-0.5">{x.t}</div>
            <div className="text-[12.5px] leading-[1.45] text-[#5c6b78]">{x.d}</div>
          </div>
        ))}
      </div>
      <div className="bg-white border border-[#0d2236]/10 rounded-[18px] p-6 max-w-[720px]">
        <div className="text-[11px] font-bold tracking-[0.1em] uppercase text-[#5c6b78] mb-3">Payout schedule</div>
        <div className="grid grid-cols-2 gap-3">
          {(["weekly", "each"] as const).map((s) => {
            const on = s === schedule;
            return (
              <button
                key={s}
                onClick={() => setSchedule(s)}
                className="border rounded-xl p-4 text-left"
                style={{
                  borderColor: on ? "#e3c089" : "rgba(13,34,54,.10)",
                  background: on ? "#fbf6ec" : "#fff",
                }}
              >
                <div className="text-[13.5px] font-semibold text-[#0d2236]">
                  {s === "weekly" ? "Weekly" : "After each trip"}
                </div>
                <div className="text-[12px] text-[#5c6b78] mt-1">
                  {s === "weekly"
                    ? "Auto-batched every Monday."
                    : "Payout released as soon as escrow clears."}
                </div>
              </button>
            );
          })}
        </div>
        <div className="text-[12px] text-[#5c6b78] mt-4">
          Stripe Connect linking is enabled after your first booking. You can adjust this later in Settings.
        </div>
      </div>
    </>
  );
}

function ListingStep({ listing, setListing }: { listing: any; setListing: (v: any) => void }) {
  const chips = [
    ["tackle", "Tackle"],
    ["bait", "Bait"],
    ["license", "License"],
    ["drinks", "Drinks"],
    ["photos", "Photos"],
    ["cleaning", "Fish cleaning"],
  ] as const;
  return (
    <div className="bg-white border border-[#0d2236]/10 rounded-[18px] p-6 max-w-[720px]">
      <label className="block mb-4">
        <span className={labelCls}>Title</span>
        <input
          value={listing.title}
          onChange={(e) => setListing({ ...listing, title: e.target.value })}
          className={inputCls}
        />
      </label>
      <div className="grid grid-cols-3 gap-4 mb-4">
        <label className="block">
          <span className={labelCls}>Duration (min)</span>
          <input
            type="number"
            min={30}
            step={30}
            value={listing.durationMinutes}
            onChange={(e) => setListing({ ...listing, durationMinutes: parseInt(e.target.value) || 30 })}
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className={labelCls}>Capacity</span>
          <input
            type="number"
            min={1}
            max={50}
            value={listing.capacity}
            onChange={(e) => setListing({ ...listing, capacity: parseInt(e.target.value) || 1 })}
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className={labelCls}>Price (USD)</span>
          <input
            type="number"
            min={0}
            value={listing.price}
            onChange={(e) => setListing({ ...listing, price: parseInt(e.target.value) || 0 })}
            className={inputCls}
          />
        </label>
      </div>
      <div>
        <div className={labelCls}>What's included</div>
        <div className="flex flex-wrap gap-2">
          {chips.map(([k, l]) => {
            const on = !!listing.inc[k];
            return (
              <button
                key={k}
                onClick={() => setListing({ ...listing, inc: { ...listing.inc, [k]: !on } })}
                className="border rounded-full px-[14px] py-[8px] text-[12.5px] font-semibold"
                style={{
                  background: on ? "#fbf6ec" : "#fff",
                  borderColor: on ? "#e3c089" : "rgba(13,34,54,.10)",
                  color: on ? "#a97e3c" : "#0d2236",
                }}
              >
                {l}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ReviewStep({
  profile,
  listing,
  verifyStatus,
  payoutSchedule,
}: {
  profile: any;
  listing: any;
  verifyStatus: string;
  payoutSchedule: string;
}) {
  const rows = [
    ["Business", profile.name || "—"],
    ["Category", profile.categoryKey],
    ["Homeport", profile.city || "—"],
    ["Verification", verifyStatus],
    ["Payouts", payoutSchedule === "weekly" ? "Weekly" : "After each trip"],
    ["Listing", `${listing.title} · ${listing.capacity} guests · $${listing.price}`],
  ];
  return (
    <div className="bg-white border border-[#0d2236]/10 rounded-[18px] p-6 max-w-[720px]">
      <div className="grid gap-3">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between border-b border-[#0d2236]/[0.06] pb-3 last:border-0 last:pb-0">
            <span className="text-[12px] font-bold tracking-[0.1em] uppercase text-[#5c6b78]">{k}</span>
            <span className="text-[13.5px] text-[#0d2236] text-right">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
