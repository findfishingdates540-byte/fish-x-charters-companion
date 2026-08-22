/**
 * Angler booking flow, pixel-ported from public/dashboards/booking.html.
 * Real DB write: `Place booking` calls createBookingFromService which inserts a
 * booking row (status=confirmed, escrow_state=held) tied to the signed-in
 * angler. Stripe wiring is TODO — for now escrow is simulated in the DB.
 */
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { createBookingFromService, getCheckoutContext } from "@/lib/booking-checkout.functions";
import { PublicAvailabilityCalendar, type PublicSlot } from "@/components/booking/PublicAvailabilityCalendar";
import { DEFAULT_HERO, galleryFor } from "@/lib/platform-photos";

const V = {
  serif: "'Cormorant Garamond',Georgia,serif",
  sans: "'Hanken Grotesk',system-ui,sans-serif",
  ink: "#0d2236", navy: "#0a2236", paper: "#eef2f5", card: "#fff",
  sand: "#e3c089", sandsoft: "#f4e6cd", goldtext: "#a97e3c",
  cyan: "#1f9fbe", cyansoft: "#e2eef2", green: "#1f8a5b", greensoft: "#e2f2ea",
  ond: "#eaf1f6", ondmut: "#93a7b7", tmut: "#5c6b78",
  line: "rgba(13,34,54,.10)", lined: "rgba(255,255,255,.12)",
};

const money = (n: number) => `$${Math.round(n / 100).toLocaleString()}`;

const MONO = "ui-monospace,SFMono-Regular,Menlo,monospace";

const cardDark: CSSProperties = {
  background: "rgba(255,255,255,.035)",
  border: `1px solid ${V.lined}`,
  borderRadius: 16,
  padding: 28,
};
const h2Dark: CSSProperties = {
  fontFamily: V.serif,
  fontWeight: 700,
  fontSize: 28,
  color: "#fff",
  margin: "0 0 18px",
};
const railLabel: CSSProperties = {
  display: "block",
  fontFamily: MONO,
  fontSize: 10.5,
  fontWeight: 700,
  letterSpacing: ".14em",
  textTransform: "uppercase",
  color: V.cyan,
  marginBottom: 8,
};
const railField: CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,.05)",
  border: `1px solid ${V.lined}`,
  borderRadius: 10,
  padding: "13px 14px",
  fontFamily: MONO,
  fontSize: 15,
  fontWeight: 600,
  color: "#fff",
  outline: "none",
  colorScheme: "dark",
};

export const checkoutQuery = (serviceId: string) =>
  queryOptions({
    queryKey: ["checkout", serviceId],
    queryFn: () => getCheckoutContext({ data: { serviceId } }),
  });

type Step = "detail" | "extras" | "checkout" | "confirmed";

const CRUMBS: Array<{ k: Step | "results"; label: string }> = [
  { k: "results", label: "Browse" },
  { k: "detail", label: "Trip" },
  { k: "extras", label: "Add-ons" },
  { k: "checkout", label: "Checkout" },
  { k: "confirmed", label: "Confirmed" },
];

const STEP_ORDER: Array<Step | "results"> = ["results", "detail", "extras", "checkout", "confirmed"];

const CANCELLATION_RULES: Array<[string, string]> = [
  [
    "7+ days out — full deposit refund",
    "Cancel a week or more before departure and your deposit is returned in full, no questions asked.",
  ],
  [
    "Captain-declared weather call — full refund or free reschedule",
    "If the captain cancels for weather or unsafe conditions, choose a full refund or move to any open date at no cost.",
  ],
  [
    "Inside 48 hours or no-show — deposit forfeited",
    "Late cancellations keep the boat off the water, so the deposit stays with the captain.",
  ],
];


export function BookingFlow({ serviceId }: { serviceId: string }) {
  const navigate = useNavigate();
  const { data: svc } = useSuspenseQuery(checkoutQuery(serviceId));
  const business = svc.business as { id: string; slug: string; name: string; city: string | null; region: string | null; logo_url: string | null; hero_url: string | null } | null;

  const [step, setStep] = useState<Step>("detail");
  const openSlots = svc.openSlots ?? [];
  const [slotId, setSlotId] = useState(() => openSlots[0]?.id ?? "");
  const slot = openSlots.find((s) => s.id === slotId) ?? openSlots[0] ?? null;
  const [party, setParty] = useState(2);

  const addons = (svc as any).addons as Array<{
    id: string; title: string; description: string | null; price_cents: number; unit: "per_trip" | "per_person";
  }> ?? [];
  const packages = ((svc as any).packages ?? []) as Array<{
    id: string; title: string; duration_minutes: number | null; base_price_cents: number; capacity: number | null;
  }>;
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const toggleAddon = (id: string) =>
    setSelectedAddons((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const [processing, setProcessing] = useState(false);
  const [confirmedId, setConfirmedId] = useState<string | null>(null);
  const [released, setReleased] = useState(false);
  const [stars, setStars] = useState(0);
  const [reviewed, setReviewed] = useState(false);
  const [toast, setToast] = useState("");

  const instantBook = svc.instant_book !== false;
  const seatsLeft = slot?.seatsLeft ?? 0;
  const cap = Math.max(1, Math.min(svc.capacity ?? 8, seatsLeft || svc.capacity || 8));
  const price = (slot?.priceCents ?? svc.base_price_cents ?? 0) * party;
  const addonLines = addons
    .filter((a) => selectedAddons.includes(a.id))
    .map((a) => {
      const quantity = a.unit === "per_person" ? party : 1;
      return { ...a, quantity, lineCents: a.price_cents * quantity };
    });
  const addonCents = addonLines.reduce((s, l) => s + l.lineCents, 0);
  const fee = 0;
  const total = price + addonCents + fee;
  /** 25% booked online; the captain collects the rest on the day. */
  const deposit = Math.round(total * 0.25);
  const balanceDue = total - deposit;


  const durLabel = svc.duration_minutes ? `${Math.round(svc.duration_minutes / 60)} hrs` : "half day";
  const date = slot ? slot.startsAt.slice(0, 10) : "";
  const time = slot ? new Date(slot.startsAt).toISOString().slice(11, 16) : "";
  const dateLabel = useMemo(() => {
    if (!slot) return "No dates released";
    return new Date(slot.startsAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  }, [slot]);


  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2400); };

  const createBookingRPC = useServerFn(createBookingFromService);
  // Stable per attempt: a double-click or retry returns the same booking
  // instead of reserving a second set of seats.
  const [attemptKey, setAttemptKey] = useState(() => crypto.randomUUID());
  const placeMut = useMutation({
    mutationFn: () => {
      if (!slot) throw new Error("Pick an available departure first.");
      return createBookingRPC({
        data: {
          slotId: slot.id,
          partySize: party,
          idempotencyKey: attemptKey,
          origin: typeof window !== "undefined" ? window.location.origin : undefined,
        },
      });
    },

    onMutate: () => setProcessing(true),
    onSuccess: (res) => {
      if (res.checkoutUrl) {
        // Hand off to Stripe Checkout; we come back with ?paid=1&booking_id=...
        window.location.href = res.checkoutUrl;
        return;
      }
      setConfirmedId(res.bookingId);
      setStep("confirmed");
      setProcessing(false);
      window.scrollTo(0, 0);
    },
    onError: (e: unknown) => {
      setProcessing(false);
      showToast(e instanceof Error ? e.message : "Booking failed");
    },
  });

  // Returning from Stripe Checkout.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search);
    if (q.get("paid") === "1" && q.get("booking_id")) {
      setConfirmedId(q.get("booking_id"));
      setStep("confirmed");
      window.scrollTo(0, 0);
    } else if (q.get("canceled") === "1") {
      showToast("Payment canceled — your trip wasn't booked.");
    }
  }, []);


  useEffect(() => { if (party > cap) setParty(cap); }, [party, cap]);
  // Changing what you're buying starts a fresh reservation attempt.
  useEffect(() => { setAttemptKey(crypto.randomUUID()); }, [slotId, party]);


  const crumbStyle = (k: Step | "results"): CSSProperties => {
    const order: Array<Step | "results"> = ["results", "detail", "checkout", "confirmed"];
    const i = order.indexOf(k);
    const cur = order.indexOf(step);
    const done = i < cur, active = i === cur;
    return { display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 600, color: done ? V.sand : active ? "#fff" : V.ondmut };
  };
  const crumbNumStyle = (k: Step | "results", n: number): { style: CSSProperties; label: string } => {
    const order: Array<Step | "results"> = ["results", "detail", "checkout", "confirmed"];
    const i = order.indexOf(k);
    const cur = order.indexOf(step);
    const done = i < cur, active = i === cur;
    return {
      style: {
        width: 20, height: 20, borderRadius: "50%",
        background: done || active ? V.sand : "rgba(255,255,255,.1)",
        color: done || active ? "#1c1303" : V.ondmut,
        display: "grid", placeItems: "center", fontSize: 11,
      },
      label: done ? "✓" : String(n),
    };
  };

  const heroUrl = svc.hero_url || business?.hero_url || DEFAULT_HERO;
  const businessLine = `${business?.name ?? "Captain"} · ${[business?.city, business?.region].filter(Boolean).join(", ") || "Coastal"}`;

  const isDetail = step === "detail";
  const galleryUrls = [
    heroUrl,
    ...galleryFor(svc.id, 5).filter((u) => u !== heroUrl),
  ].slice(0, 5);

  const locationLine =
    svc.departure_location || [business?.city, business?.region].filter(Boolean).join(" · ") || "Coastal marina";
  const capacity = svc.capacity ?? cap;
  const specs = [
    { k: "Duration", v: svc.duration_minutes ? `${Math.round(svc.duration_minutes / 60)} Hours` : "Full day" },
    { k: "Max capacity", v: `${capacity} Anglers` },
    { k: "Tackle included", v: (svc.includes && svc.includes[0]) || "Rods & live bait" },
  ];
  const amenities =
    svc.includes && svc.includes.length > 1
      ? svc.includes
      : ["Garmin Radar/Sonar", "Live Bait Well", "Shade Top", "Trophy Tackle Provided", "Ice Box", "Safety Gear"];

  return (
    <div style={{ minHeight: "100vh", background: isDetail ? V.navy : V.paper, color: isDetail ? V.ond : V.ink, fontFamily: V.sans }}>

      {/* TOP BAR */}
      <header style={{ position: "sticky", top: 0, zIndex: 30, background: V.navy, color: V.ond }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 28px", height: 64, display: "flex", alignItems: "center", gap: 24 }}>
          <Link to="/marketplace" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: V.ond }}>
            <span style={{ width: 11, height: 11, background: V.sand, transform: "rotate(45deg)", display: "inline-block", borderRadius: 1 }} />
            <span style={{ fontFamily: V.serif, fontWeight: 600, fontSize: 20, letterSpacing: ".02em", whiteSpace: "nowrap" }}>FISH-X.COM</span>
          </Link>
          <div style={{ margin: "0 auto", display: "flex", alignItems: "center", gap: 8 }}>
            {CRUMBS.map((c, i) => (
              <span key={c.k} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={crumbStyle(c.k)}>
                  <span style={crumbNumStyle(c.k, i + 1).style}>{crumbNumStyle(c.k, i + 1).label}</span> {c.label}
                </span>
                {i < CRUMBS.length - 1 && <span style={{ width: 22, height: 1, background: V.lined }} />}
              </span>
            ))}
          </div>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, border: `1px solid ${V.lined}`, borderRadius: 30, padding: "8px 13px", fontSize: 11.5, fontWeight: 600 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: V.cyan, boxShadow: `0 0 8px ${V.cyan}` }} /> Secured by escrow
          </span>
        </div>
      </header>

      <main
        className="fx-booking-main"
        style={
          isDetail
            ? { width: "100%", margin: 0, padding: "26px 40px 80px" }
            : { maxWidth: 1180, margin: "0 auto", padding: "28px 28px 60px" }
        }
      >
        {/* ==== DETAIL ==== */}
        {step === "detail" && (
          <div>
            <Link
              to="/dashboard"
              search={{ tab: "explore" }}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, color: V.ondmut, fontSize: 13.5, fontWeight: 600, textDecoration: "none", marginBottom: 18 }}
            >
              ← Back to charters
            </Link>

            {/* TITLE BLOCK */}
            <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: V.cyan, fontFamily: "ui-monospace,SFMono-Regular,Menlo,monospace", marginBottom: 10 }}>
              <span>◉</span> {locationLine}
            </div>
            <h1 style={{ fontFamily: V.serif, fontWeight: 700, fontSize: "clamp(34px,5vw,58px)", lineHeight: 1.02, margin: "0 0 14px", color: "#fff" }}>
              {svc.title}
            </h1>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 18, fontFamily: "ui-monospace,SFMono-Regular,Menlo,monospace", fontSize: 13.5, marginBottom: 26 }}>
              <span style={{ color: V.sand }}>★ 4.98 <span style={{ opacity: 0.8 }}>(42 reviews)</span></span>
              <span style={{ color: V.ondmut }}>·</span>
              <span style={{ color: V.cyan }}>Captain: {business?.name ?? "Fish-X operator"}</span>
              <span style={{ color: V.ondmut }}>·</span>
              <span style={{ color: "#4ec98e" }}>⛊ USCG Verified Charter</span>
            </div>

            {/* GALLERY */}
            <div className="fx-booking-gallery" style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 18, marginBottom: 34 }}>
              <img
                src={galleryUrls[0]}
                alt={svc.title ?? "Charter"}
                style={{ width: "100%", height: 520, objectFit: "cover", borderRadius: 14, border: `1px solid ${V.lined}` }}
              />
              <div style={{ display: "grid", gridTemplateRows: "1fr 1fr", gap: 18 }}>
                {galleryUrls.slice(1).map((u, i) => (
                  <img key={i} src={u} alt="" style={{ width: "100%", height: 251, objectFit: "cover", borderRadius: 14, border: `1px solid ${V.lined}` }} />
                ))}
              </div>
            </div>

            {/* BODY + RAIL */}
            <div className="fx-booking-grid" style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: 30, alignItems: "start" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
                {/* Charter overview */}
                <section style={cardDark}>
                  <h2 style={h2Dark}>Charter Overview</h2>
                  <p style={{ fontSize: 15.5, lineHeight: 1.7, color: V.ond, opacity: 0.85, margin: "0 0 22px", maxWidth: 760 }}>
                    {`Experience a world-class day on the water with ${business?.name ?? "this operator"} out of ${locationLine}. Every booking is protected by Fish-X escrow — your payment is only released to the captain after the trip is complete.`}
                  </p>
                  <div className="fx-spec-strip" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18, border: `1px solid ${V.lined}`, borderRadius: 12, padding: "18px 22px" }}>
                    {specs.map((s) => (
                      <div key={s.k}>
                        <div style={{ fontSize: 10.5, letterSpacing: ".16em", textTransform: "uppercase", color: V.ondmut, marginBottom: 6 }}>{s.k}</div>
                        <div style={{ fontFamily: "ui-monospace,SFMono-Regular,Menlo,monospace", fontSize: 15, fontWeight: 600, color: V.cyan }}>{s.v}</div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Vessel specifications */}
                <section style={cardDark}>
                  <h2 style={h2Dark}>Vessel Specifications</h2>
                  <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 22 }}>
                    <span style={{ width: 54, height: 54, borderRadius: 12, background: "rgba(227,192,137,.14)", color: V.sand, display: "grid", placeItems: "center", fontSize: 24, flex: "none" }}>⚓</span>
                    <div>
                      <div style={{ fontFamily: V.serif, fontSize: 22, fontWeight: 700, color: "#fff" }}>Center Console · Twin Outboard</div>
                      <div style={{ fontFamily: "ui-monospace,SFMono-Regular,Menlo,monospace", fontSize: 13.5, color: V.cyan, marginTop: 3 }}>Capacity: {capacity} anglers</div>
                    </div>
                  </div>
                  <div className="fx-amenities" style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "13px 26px" }}>
                    {amenities.slice(0, 8).map((a) => (
                      <div key={a} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14.5, color: V.ond }}>
                        <span style={{ color: "#4ec98e", flex: "none" }}>⊘</span>
                        {a}
                      </div>
                    ))}
                  </div>
                </section>

                {/* Captain */}
                <section style={cardDark}>
                  <h2 style={h2Dark}>Your Captain</h2>
                  <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                    {business?.logo_url ? (
                      <img src={business.logo_url} alt="" style={{ width: 66, height: 66, borderRadius: "50%", objectFit: "cover", flex: "none" }} />
                    ) : (
                      <div style={{ width: 66, height: 66, borderRadius: "50%", background: "rgba(255,255,255,.08)", color: V.sand, display: "grid", placeItems: "center", fontFamily: V.serif, fontSize: 26, flex: "none" }}>
                        {(business?.name ?? "F").slice(0, 1)}
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: V.serif, fontSize: 21, fontWeight: 700, color: "#fff" }}>{business?.name ?? "Fish-X operator"}</div>
                      <div style={{ fontSize: 13.5, color: V.ondmut, marginTop: 3 }}>Verified operator · Escrow protected · Responds within an hour</div>
                    </div>
                    {business?.slug && (
                      <Link to="/b/$slug" params={{ slug: business.slug }} style={{ border: `1px solid ${V.lined}`, borderRadius: 10, padding: "10px 16px", fontSize: 13, fontWeight: 700, color: V.ond, textDecoration: "none", whiteSpace: "nowrap" }}>
                        View profile
                      </Link>
                    )}
                  </div>
                </section>

                {/* Escrow explainer */}
                <section style={cardDark}>
                  <h2 style={h2Dark}>How Payment Works</h2>
                  <div className="fx-escrow-steps" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18 }}>
                    {[
                      ["1", "You pay", "Funds are captured and held by Fish-X — never sent straight to the captain."],
                      ["2", "You fish", "The captain runs the trip. Anything goes wrong, open a resolution case."],
                      ["3", "Captain paid", "Escrow releases 24 hours after the trip is marked complete."],
                    ].map(([n, t, d]) => (
                      <div key={n} style={{ border: `1px solid ${V.lined}`, borderRadius: 12, padding: 18 }}>
                        <span style={{ width: 26, height: 26, borderRadius: "50%", background: V.sand, color: "#1c1303", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700 }}>{n}</span>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: "12px 0 6px" }}>{t}</div>
                        <div style={{ fontSize: 13.5, lineHeight: 1.55, color: V.ondmut }}>{d}</div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              {/* BOOKING RAIL */}
              <div className="fx-booking-rail" style={{ position: "sticky", top: 84, ...cardDark, padding: 24 }}>
                <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 18 }}>
                  <span style={{ fontFamily: "ui-monospace,SFMono-Regular,Menlo,monospace", fontSize: 32, fontWeight: 700, color: "#fff" }}>{money(slot?.priceCents ?? svc.base_price_cents ?? 0)}</span>
                  <span style={{ fontSize: 13, color: V.ondmut }}>/ angler · {durLabel}</span>
                  <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "#4ec98e", background: "rgba(78,201,142,.12)", border: "1px solid rgba(78,201,142,.35)", borderRadius: 6, padding: "6px 9px", whiteSpace: "nowrap" }}>
                    Escrow guaranteed
                  </span>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <PublicAvailabilityCalendar
                    serviceId={serviceId}
                    selectedSlotId={slot?.id ?? null}
                    partySize={party}
                    theme="dark"
                    onSelectSlot={(s: PublicSlot) => setSlotId(s.id)}
                  />
                </div>




                <label style={{ display: "block", marginBottom: 22 }}>
                  <span style={railLabel}>Number of anglers (max {cap})</span>
                  <select value={party} onChange={(e) => setParty(Number(e.target.value))} style={railField}>
                    {Array.from({ length: cap }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n} style={{ color: "#0a2236" }}>{n} {n === 1 ? "Angler" : "Anglers"}</option>
                    ))}
                  </select>
                </label>

                <div style={{ borderTop: `1px solid ${V.lined}`, paddingTop: 16, fontFamily: "ui-monospace,SFMono-Regular,Menlo,monospace", fontSize: 13.5 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", color: V.ondmut }}>
                    <span>{money(slot?.priceCents ?? svc.base_price_cents ?? 0)} × {party} angler{party === 1 ? "" : "s"}</span><span style={{ color: V.ond }}>{money(price)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", color: V.ondmut }}>
                    <span>Fish-X booking fee</span><span style={{ color: "#4ec98e" }}>$0 (Waived)</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 0 4px", borderTop: `1px solid ${V.lined}`, marginTop: 10, fontSize: 15.5, fontWeight: 700, color: "#fff" }}>
                    <span>Deposit due today (25%)</span><span>{money(deposit)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", color: V.ondmut }}>
                    <span>Balance paid to captain on the day</span><span style={{ color: V.ond }}>{money(balanceDue)}</span>
                  </div>
                </div>


                <button
                  onClick={() => setStep("checkout")}
                  disabled={!slot}
                  style={{ width: "100%", background: slot ? `linear-gradient(180deg, ${V.sandsoft}, ${V.sand})` : "rgba(255,255,255,.12)", color: slot ? "#1c1303" : V.ondmut, border: 0, borderRadius: 12, padding: 16, fontFamily: V.sans, fontSize: 15, fontWeight: 700, cursor: slot ? "pointer" : "not-allowed", margin: "20px 0 12px" }}
                >
                  {slot ? "Continue to secure checkout →" : "No dates available"}
                </button>
                <div style={{ fontFamily: "ui-monospace,SFMono-Regular,Menlo,monospace", fontSize: 11.5, color: V.ondmut, textAlign: "center", lineHeight: 1.5 }}>
                  {instantBook
                    ? "Seats held for 15 minutes. Funds released after your trip."
                    : "Card authorised, not charged — the captain has 24 hours to accept."}
                </div>

              </div>
            </div>
          </div>
        )}


        {/* ==== CHECKOUT ==== */}
        {step === "checkout" && (
          <div>
            <button onClick={() => setStep("detail")} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "transparent", border: 0, color: V.tmut, fontSize: 13.5, fontWeight: 600, cursor: "pointer", marginBottom: 16 }}>← Back to trip</button>
            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 30, alignItems: "start" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {[
                  { n: 1, title: "Trip summary" },
                  { n: 2, title: "Your details" },
                  { n: 3, title: "Payment" },
                ].map((sec) => (
                  <div key={sec.n} style={{ background: V.card, border: `1px solid ${V.line}`, borderRadius: 18, padding: 22 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                      <span style={{ width: 26, height: 26, borderRadius: "50%", background: V.navy, color: "#fff", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700 }}>{sec.n}</span>
                      <span style={{ fontFamily: V.serif, fontSize: 20, fontWeight: 600 }}>{sec.title}</span>
                    </div>
                    {sec.n === 1 && (
                      <div style={{ display: "flex", gap: 16 }}>
                        <img src={heroUrl} alt="" style={{ width: 96, height: 74, borderRadius: 12, objectFit: "cover", flex: "none" }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 15, fontWeight: 600 }}>{svc.title}</div>
                          <div style={{ fontSize: 13, color: V.tmut, marginTop: 3 }}>{businessLine}</div>
                          <div style={{ fontSize: 13, color: V.tmut, marginTop: 6 }}>{dateLabel} · {time} · {party} anglers</div>
                        </div>
                      </div>
                    )}
                    {sec.n === 2 && (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <label style={{ display: "block" }}>
                          <span style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: V.tmut, marginBottom: 6 }}>Full name</span>
                          <input defaultValue="Angler" style={{ width: "100%", background: V.paper, border: `1px solid ${V.line}`, borderRadius: 10, padding: "12px 13px", fontFamily: V.sans, fontSize: 14, color: V.ink, outline: "none" }} />
                        </label>
                        <label style={{ display: "block" }}>
                          <span style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: V.tmut, marginBottom: 6 }}>Email</span>
                          <input defaultValue="you@email.com" style={{ width: "100%", background: V.paper, border: `1px solid ${V.line}`, borderRadius: 10, padding: "12px 13px", fontFamily: V.sans, fontSize: 14, color: V.ink, outline: "none" }} />
                        </label>
                      </div>
                    )}
                    {sec.n === 3 && (
                      <>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, background: V.paper, border: `1px solid ${V.line}`, borderRadius: 12, padding: "14px 16px", marginBottom: 14 }}>
                          <span style={{ fontSize: 20 }}>💳</span>
                          <div>
                            <div style={{ fontSize: 13.5, fontWeight: 700 }}>Secure card payment via Stripe</div>
                            <div style={{ fontSize: 12.5, color: V.tmut, marginTop: 2 }}>You'll be taken to Stripe's hosted checkout to enter your card, then returned here.</div>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, background: V.cyansoft, borderRadius: 11, padding: "13px 15px" }}>
                          <span style={{ color: V.cyan, flex: "none", marginTop: 1 }}>🔒</span>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700 }}>Charged to escrow — not the captain</div>
                            <div style={{ fontSize: 12.5, lineHeight: 1.5, color: V.tmut, marginTop: 2 }}>Held by Fish-X and released to your captain 24 hours after the trip is completed.</div>
                          </div>
                        </div>
                      </>
                    )}

                  </div>
                ))}
              </div>
              <div style={{ position: "sticky", top: 88, background: V.card, border: `1px solid ${V.line}`, borderRadius: 20, padding: 24, boxShadow: "0 24px 50px -34px rgba(13,34,54,.4)" }}>
                <div style={{ fontFamily: V.serif, fontWeight: 600, fontSize: 20, marginBottom: 16 }}>Order summary</div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, padding: "7px 0", color: V.tmut }}><span>Trip total</span><span style={{ color: V.ink }}>{money(price)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, padding: "7px 0", color: V.tmut }}><span>Fish-X service fee</span><span style={{ color: V.ink }}>Included</span></div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 700, padding: "12px 0", borderTop: `1px solid ${V.line}`, marginTop: 5 }}>
                  <span>Deposit due today (25%)</span><span style={{ fontFamily: V.serif, fontSize: 22 }}>{money(deposit)}</span>
                </div>
                <div style={{ margin: "6px 0 14px", padding: "12px 14px", border: "1px dashed rgba(31,159,190,.5)", borderRadius: 12, background: "#eef7fa" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}><span style={{ color: V.tmut }}>Deposit held in escrow</span><span style={{ fontWeight: 700, color: V.cyan }}>{money(deposit)}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginTop: 5 }}><span style={{ color: V.tmut }}>Balance to captain on the day</span><span style={{ fontWeight: 700 }}>{money(balanceDue)}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginTop: 5 }}><span style={{ color: V.tmut }}>Deposit released to captain</span><span>3 days after your trip</span></div>
                  <div style={{ fontSize: 11.5, color: V.tmut, marginTop: 8, lineHeight: 1.5 }}>
                    Pay the balance directly to your captain — cash or card, and tips are customary. Anglers are responsible for their own fishing licenses.
                  </div>
                </div>

                <button
                  onClick={() => placeMut.mutate()}
                  disabled={placeMut.isPending}
                  style={{ width: "100%", background: V.sand, color: "#1c1303", border: 0, borderRadius: 12, padding: 15, fontFamily: V.sans, fontSize: 13.5, fontWeight: 700, letterSpacing: ".05em", cursor: "pointer", opacity: placeMut.isPending ? 0.7 : 1 }}
                >
                  Place booking · pay 25% deposit
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==== CONFIRMED ==== */}
        {step === "confirmed" && confirmedId && (
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 26 }}>
              <div style={{ width: 74, height: 74, borderRadius: "50%", background: V.greensoft, display: "grid", placeItems: "center", color: V.green, margin: "8px auto 18px", fontSize: 32 }}>✓</div>
              <h1 style={{ fontFamily: V.serif, fontWeight: 600, fontSize: 36, lineHeight: 1.05, margin: "0 0 8px" }}>You're booked — and protected.</h1>
              <p style={{ fontSize: 15.5, color: V.tmut, margin: 0 }}>Confirmation <b style={{ color: V.ink }}>#{confirmedId.slice(0, 8).toUpperCase()}</b></p>
            </div>

            {/* Escrow timeline */}
            <div style={{ background: V.card, border: `1px solid ${V.line}`, borderRadius: 20, padding: 26, marginBottom: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 22 }}>
                <span style={{ width: 38, height: 38, borderRadius: "50%", background: V.cyansoft, display: "grid", placeItems: "center", color: V.cyan, fontSize: 18 }}>🔒</span>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: V.cyan }}>Escrow status</div>
                  <div style={{ fontFamily: V.serif, fontSize: 20 }}>{released ? "Trip complete — captain paid" : `Your ${money(deposit)} deposit is held safely`}</div>
                </div>
              </div>
              <div style={{ position: "relative", display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ position: "absolute", left: 9, right: 9, top: 9, height: 2, background: V.line }} />
                <div style={{ position: "absolute", left: 9, top: 9, height: 2, width: released ? "calc(100% - 18px)" : "30%", background: `linear-gradient(90deg,${V.cyan},${V.sand})`, transition: "width 1.2s cubic-bezier(.4,0,.1,1)" }} />
                <span style={{ position: "relative", width: 20, height: 20, borderRadius: "50%", background: V.cyan, display: "grid", placeItems: "center", color: "#fff", fontSize: 10 }}>✓</span>
                <span style={{ position: "relative", width: 20, height: 20, borderRadius: "50%", background: V.cyan }} />
                <span style={{ position: "relative", width: 20, height: 20, borderRadius: "50%", background: released ? V.green : V.card, border: released ? "0" : `2px solid ${V.line}`, display: "grid", placeItems: "center", color: "#fff", fontSize: 10 }}>{released ? "✓" : ""}</span>
                <span style={{ position: "relative", width: 20, height: 20, borderRadius: "50%", background: released ? V.green : V.card, border: released ? "0" : `2px solid ${V.line}`, display: "grid", placeItems: "center", color: "#fff", fontSize: 10 }}>{released ? "✓" : ""}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: V.tmut }}>
                <span style={{ width: "25%" }}>Reserved</span>
                <span style={{ width: "25%", textAlign: "center", color: V.cyan, fontWeight: 700 }}>Held in escrow</span>
                <span style={{ width: "25%", textAlign: "center" }}>Trip complete</span>
                <span style={{ width: "25%", textAlign: "right", color: released ? V.green : V.tmut, fontWeight: released ? 700 : 400 }}>Captain paid</span>
              </div>
            </div>

            {/* Recap */}
            <div style={{ background: V.card, border: `1px solid ${V.line}`, borderRadius: 20, padding: 24, marginBottom: 18 }}>
              <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
                <img src={heroUrl} alt="" style={{ width: 104, height: 80, borderRadius: 13, objectFit: "cover", flex: "none" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: V.serif, fontSize: 21, fontWeight: 600 }}>{svc.title}</div>
                  <div style={{ fontSize: 13.5, color: V.tmut, marginTop: 4 }}>{dateLabel} · {time} · {party} anglers</div>
                  <div style={{ fontSize: 13, color: V.tmut, marginTop: 6 }}>{business?.name ?? "Captain"}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
                <button onClick={() => navigate({ to: "/trips/detail", search: { id: confirmedId } })} style={{ background: V.navy, color: "#fff", border: 0, borderRadius: 11, padding: "12px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>View in dashboard</button>
                <Link to="/dashboard" style={{ background: "transparent", border: `1px solid ${V.line}`, borderRadius: 11, padding: "12px 18px", fontSize: 13, fontWeight: 600, color: V.ink, textDecoration: "none" }}>Back to dashboard</Link>
              </div>
            </div>

            {/* Demo simulate */}
            {!released && (
              <div style={{ border: "1px dashed rgba(13,34,54,.24)", borderRadius: 16, padding: "18px 20px", display: "flex", alignItems: "center", gap: 16, background: "rgba(255,255,255,.5)" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>Preview the payoff</div>
                  <div style={{ fontSize: 12.5, color: V.tmut, marginTop: 2 }}>Simulate your trip finishing to see escrow release to the captain.</div>
                </div>
                <button onClick={() => setReleased(true)} style={{ flex: "none", background: V.green, color: "#fff", border: 0, borderRadius: 11, padding: "12px 18px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>▶ Mark trip completed</button>
              </div>
            )}

            {/* Review */}
            {released && (
              <div style={{ background: V.card, border: `1px solid ${V.line}`, borderRadius: 20, padding: 24, marginTop: 18 }}>
                {!reviewed ? (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                      <span style={{ width: 26, height: 26, borderRadius: "50%", background: V.greensoft, display: "grid", placeItems: "center", color: V.green, fontSize: 13 }}>✓</span>
                      <div style={{ fontFamily: V.serif, fontSize: 20, fontWeight: 600 }}>Trip complete — captain paid</div>
                    </div>
                    <p style={{ fontSize: 14, color: V.tmut, margin: "0 0 16px 36px" }}>Deposit released to your captain. How was your day on the water?</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "0 0 14px 36px" }}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button key={n} onClick={() => setStars(n)} style={{ background: "none", border: 0, cursor: "pointer", fontSize: 30, padding: 0, color: n <= stars ? V.sand : V.line }}>★</button>
                      ))}
                    </div>
                    <textarea placeholder="Share a few words about your trip…" style={{ width: "100%", minHeight: 78, background: V.paper, border: `1px solid ${V.line}`, borderRadius: 12, padding: 13, fontFamily: V.sans, fontSize: 14, color: V.ink, outline: "none", resize: "vertical", marginBottom: 14 }} />
                    <button
                      onClick={() => { if (stars === 0) { showToast("Tap the stars first"); return; } setReviewed(true); showToast("Review posted — thank you!"); }}
                      style={{ background: V.sand, color: "#1c1303", border: 0, borderRadius: 11, padding: "13px 22px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                    >
                      Post review
                    </button>
                  </>
                ) : (
                  <div style={{ textAlign: "center", padding: "14px 10px" }}>
                    <div style={{ color: V.sand, fontSize: 22, letterSpacing: 3, marginBottom: 10 }}>★★★★★</div>
                    <div style={{ fontFamily: V.serif, fontSize: 22, fontWeight: 600 }}>Thank you for the review!</div>
                    <Link to="/marketplace" style={{ display: "inline-flex", background: V.navy, color: "#fff", textDecoration: "none", borderRadius: 11, padding: "13px 24px", fontSize: 13, fontWeight: 700, marginTop: 18 }}>Book another trip</Link>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Processing overlay */}
      {processing && (
        <div style={{ position: "fixed", inset: 0, zIndex: 70, background: "rgba(238,242,245,.9)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 76, height: 76, margin: "0 auto 22px", border: `2px solid ${V.line}`, borderTopColor: V.cyan, borderRadius: "50%", animation: "fx-spin 1s linear infinite" }} />
            <div style={{ fontFamily: V.serif, fontSize: 25, fontWeight: 600, marginBottom: 6 }}>Securing your payment in escrow…</div>
            <div style={{ fontSize: 14, color: V.tmut }}>Encrypting and notifying the captain.</div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", zIndex: 80, background: V.navy, color: "#fff", borderRadius: 30, padding: "13px 22px", fontSize: 13.5, fontWeight: 600, boxShadow: "0 20px 44px -20px rgba(0,0,0,.6)" }}>
          {toast}
        </div>
      )}

      <style>{`@keyframes fx-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
