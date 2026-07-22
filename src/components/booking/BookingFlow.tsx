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

export const checkoutQuery = (serviceId: string) =>
  queryOptions({
    queryKey: ["checkout", serviceId],
    queryFn: () => getCheckoutContext({ data: { serviceId } }),
  });

type Step = "detail" | "checkout" | "confirmed";

const CRUMBS: Array<{ k: Step | "results"; label: string }> = [
  { k: "results", label: "Browse" },
  { k: "detail", label: "Trip" },
  { k: "checkout", label: "Checkout" },
  { k: "confirmed", label: "Confirmed" },
];

export function BookingFlow({ serviceId }: { serviceId: string }) {
  const navigate = useNavigate();
  const { data: svc } = useSuspenseQuery(checkoutQuery(serviceId));
  const business = svc.business as { id: string; slug: string; name: string; city: string | null; region: string | null; logo_url: string | null; hero_url: string | null } | null;

  const [step, setStep] = useState<Step>("detail");
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });
  const [party, setParty] = useState(2);
  const [processing, setProcessing] = useState(false);
  const [confirmedId, setConfirmedId] = useState<string | null>(null);
  const [released, setReleased] = useState(false);
  const [stars, setStars] = useState(0);
  const [reviewed, setReviewed] = useState(false);
  const [toast, setToast] = useState("");

  const cap = 8;
  const price = svc.base_price_cents ?? 0;
  const fee = Math.round(price * 0.08);
  const total = price + fee;
  const durLabel = svc.duration_minutes ? `${Math.round(svc.duration_minutes / 60)} hrs` : "half day";
  const dateLabel = useMemo(() => {
    try { return new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }); }
    catch { return date; }
  }, [date]);

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2400); };

  const createBookingRPC = useServerFn(createBookingFromService);
  const placeMut = useMutation({
    mutationFn: () => createBookingRPC({ data: { serviceId, tripDate: date, partySize: party } }),
    onMutate: () => setProcessing(true),
    onSuccess: (res) => {
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

  useEffect(() => { if (party > cap) setParty(cap); }, [party]);

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

  const heroUrl = svc.hero_url || business?.hero_url || "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200";
  const businessLine = `${business?.name ?? "Captain"} · ${[business?.city, business?.region].filter(Boolean).join(", ") || "Coastal"}`;

  return (
    <div style={{ minHeight: "100vh", background: V.paper, color: V.ink, fontFamily: V.sans }}>
      {/* TOP BAR */}
      <header style={{ position: "sticky", top: 0, zIndex: 30, background: V.navy, color: V.ond }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 28px", height: 64, display: "flex", alignItems: "center", gap: 24 }}>
          <Link to="/marketplace" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: V.ond }}>
            <span style={{ width: 11, height: 11, background: V.sand, transform: "rotate(45deg)", display: "inline-block", borderRadius: 1 }} />
            <span style={{ fontFamily: V.serif, fontWeight: 600, fontSize: 20, letterSpacing: ".1em" }}>FISH—X</span>
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

      <main style={{ maxWidth: 1180, margin: "0 auto", padding: "28px 28px 60px" }}>
        {/* ==== DETAIL ==== */}
        {step === "detail" && (
          <div>
            <Link to="/marketplace" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "transparent", color: V.tmut, fontSize: 13.5, fontWeight: 600, textDecoration: "none", marginBottom: 16 }}>
              ← Back to charters
            </Link>
            <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 30, alignItems: "start" }}>
              <div>
                <div style={{ borderRadius: 20, overflow: "hidden", border: `1px solid ${V.line}`, marginBottom: 24 }}>
                  <img src={heroUrl} alt={svc.title} style={{ width: "100%", height: 380, objectFit: "cover", objectPosition: "50% 42%" }} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: V.tmut, marginBottom: 8 }}>
                  <span style={{ color: V.sand }}>★</span>
                  <b style={{ color: V.ink }}>4.9</b> · {[business?.city, business?.region].filter(Boolean).join(", ") || "Coastal charter"}
                </div>
                <h1 style={{ fontFamily: V.serif, fontWeight: 600, fontSize: 36, lineHeight: 1.04, margin: "0 0 14px" }}>{svc.title}</h1>
                <p style={{ fontSize: 15.5, lineHeight: 1.65, color: V.tmut, maxWidth: 620, margin: "0 0 24px" }}>
                  Book with {business?.name ?? "this operator"} through Fish-X escrow. Payment is only released after your trip is complete.
                </p>
                {svc.includes && svc.includes.length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12, maxWidth: 620, marginBottom: 30 }}>
                    {svc.includes.slice(0, 6).map((inc) => (
                      <div key={inc} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
                        <span style={{ width: 30, height: 30, borderRadius: 8, background: V.sandsoft, display: "grid", placeItems: "center", color: V.goldtext, flex: "none" }}>✓</span>
                        {inc}
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ background: V.card, border: `1px solid ${V.line}`, borderRadius: 18, padding: 22, display: "flex", alignItems: "center", gap: 18, maxWidth: 620 }}>
                  {business?.logo_url ? (
                    <img src={business.logo_url} alt="" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", flex: "none" }} />
                  ) : (
                    <div style={{ width: 64, height: 64, borderRadius: "50%", background: V.navy, color: V.sand, display: "grid", placeItems: "center", fontFamily: V.serif, fontSize: 24, flex: "none" }}>
                      {(business?.name ?? "F").slice(0, 1)}
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontFamily: V.serif, fontSize: 19, fontWeight: 600 }}>{business?.name ?? "Operator"}</span>
                      <span style={{ width: 18, height: 18, borderRadius: "50%", background: V.sand, display: "grid", placeItems: "center", color: "#1c1303", fontSize: 10 }}>✓</span>
                    </div>
                    <div style={{ fontSize: 13, color: V.tmut, marginTop: 2 }}>Verified operator · Fish-X escrow</div>
                  </div>
                </div>
              </div>

              {/* BOOKING RAIL */}
              <div style={{ position: "sticky", top: 88, background: V.card, border: `1px solid ${V.line}`, borderRadius: 20, padding: 24, boxShadow: "0 24px 50px -34px rgba(13,34,54,.4)" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 18 }}>
                  <span style={{ fontFamily: V.serif, fontSize: 30, fontWeight: 600 }}>{money(price)}</span>
                  <span style={{ fontSize: 13, color: V.tmut }}>/ {durLabel}</span>
                </div>
                <div style={{ border: `1px solid ${V.line}`, borderRadius: 13, overflow: "hidden", marginBottom: 14 }}>
                  <label style={{ display: "block", padding: "11px 14px", borderBottom: `1px solid ${V.line}` }}>
                    <span style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: V.tmut, marginBottom: 3 }}>Date</span>
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ border: 0, outline: "none", background: "transparent", fontFamily: V.sans, fontSize: 14.5, fontWeight: 600, color: V.ink, width: "100%" }} />
                  </label>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 14px" }}>
                    <div>
                      <span style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: V.tmut }}>Anglers</span>
                      <span style={{ fontSize: 14.5, fontWeight: 600 }}>{party} of {cap}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <button onClick={() => setParty((p) => Math.max(1, p - 1))} style={{ width: 28, height: 28, borderRadius: "50%", border: `1px solid ${V.line}`, background: "transparent", fontSize: 16, cursor: "pointer" }}>−</button>
                      <button onClick={() => setParty((p) => Math.min(cap, p + 1))} style={{ width: 28, height: 28, borderRadius: "50%", border: `1px solid ${V.line}`, background: "transparent", fontSize: 16, cursor: "pointer" }}>+</button>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, padding: "7px 0", color: V.tmut }}><span>Trip</span><span style={{ color: V.ink }}>{money(price)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, padding: "7px 0", color: V.tmut }}><span>Service fee</span><span style={{ color: V.ink }}>{money(fee)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 700, padding: "12px 0", borderTop: `1px solid ${V.line}`, marginTop: 5 }}>
                  <span>Total</span><span style={{ fontFamily: V.serif, fontSize: 22 }}>{money(total)}</span>
                </div>
                <button onClick={() => setStep("checkout")} style={{ width: "100%", background: V.sand, color: "#1c1303", border: 0, borderRadius: 12, padding: 15, fontFamily: V.sans, fontSize: 13.5, fontWeight: 700, letterSpacing: ".05em", cursor: "pointer", margin: "8px 0 12px" }}>
                  Continue to checkout
                </button>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 9, background: V.cyansoft, borderRadius: 11, padding: "11px 13px" }}>
                  <span style={{ color: V.cyan, flex: "none", marginTop: 1 }}>🔒</span>
                  <span style={{ fontSize: 12, lineHeight: 1.5 }}>Funds are held in <b>escrow</b> until your trip is complete.</span>
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
                          <div style={{ fontSize: 13, color: V.tmut, marginTop: 6 }}>{dateLabel} · {party} anglers</div>
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
                        <label style={{ display: "block", marginBottom: 12 }}>
                          <span style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: V.tmut, marginBottom: 6 }}>Card number</span>
                          <input defaultValue="4242 4242 4242 4242" style={{ width: "100%", background: V.paper, border: `1px solid ${V.line}`, borderRadius: 10, padding: "12px 13px", fontFamily: V.sans, fontSize: 14, color: V.ink, outline: "none" }} />
                        </label>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                          <input defaultValue="08 / 27" style={{ background: V.paper, border: `1px solid ${V.line}`, borderRadius: 10, padding: "12px 13px", fontSize: 14, outline: "none" }} />
                          <input defaultValue="123" style={{ background: V.paper, border: `1px solid ${V.line}`, borderRadius: 10, padding: "12px 13px", fontSize: 14, outline: "none" }} />
                        </div>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, background: V.cyansoft, borderRadius: 11, padding: "13px 15px" }}>
                          <span style={{ color: V.cyan, flex: "none", marginTop: 1 }}>🔒</span>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700 }}>Charged to escrow — not the captain</div>
                            <div style={{ fontSize: 12.5, lineHeight: 1.5, color: V.tmut, marginTop: 2 }}>Held by Fish-X's regulated escrow partner and released only after your trip.</div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ position: "sticky", top: 88, background: V.card, border: `1px solid ${V.line}`, borderRadius: 20, padding: 24, boxShadow: "0 24px 50px -34px rgba(13,34,54,.4)" }}>
                <div style={{ fontFamily: V.serif, fontWeight: 600, fontSize: 20, marginBottom: 16 }}>Order summary</div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, padding: "7px 0", color: V.tmut }}><span>Trip</span><span style={{ color: V.ink }}>{money(price)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, padding: "7px 0", color: V.tmut }}><span>Service fee</span><span style={{ color: V.ink }}>{money(fee)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 700, padding: "12px 0", borderTop: `1px solid ${V.line}`, marginTop: 5 }}>
                  <span>Total due today</span><span style={{ fontFamily: V.serif, fontSize: 22 }}>{money(total)}</span>
                </div>
                <div style={{ margin: "6px 0 14px", padding: "12px 14px", border: "1px dashed rgba(31,159,190,.5)", borderRadius: 12, background: "#eef7fa" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}><span style={{ color: V.tmut }}>Held in escrow</span><span style={{ fontWeight: 700, color: V.cyan }}>{money(total)}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginTop: 5 }}><span style={{ color: V.tmut }}>Released to captain</span><span>After your trip</span></div>
                </div>
                <button
                  onClick={() => placeMut.mutate()}
                  disabled={placeMut.isPending}
                  style={{ width: "100%", background: V.sand, color: "#1c1303", border: 0, borderRadius: 12, padding: 15, fontFamily: V.sans, fontSize: 13.5, fontWeight: 700, letterSpacing: ".05em", cursor: "pointer", opacity: placeMut.isPending ? 0.7 : 1 }}
                >
                  Place booking · hold in escrow
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
                  <div style={{ fontFamily: V.serif, fontSize: 20 }}>{released ? "Trip complete — captain paid" : `Your ${money(total)} is held safely`}</div>
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
                  <div style={{ fontSize: 13.5, color: V.tmut, marginTop: 4 }}>{dateLabel} · {party} anglers</div>
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
                    <p style={{ fontSize: 14, color: V.tmut, margin: "0 0 16px 36px" }}>{money(total)} released from escrow. How was your day on the water?</p>
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
