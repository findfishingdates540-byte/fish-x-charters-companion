/**
 * Captain-side booking detail page. Pixel-matched to
 * public/dashboards/captain-booking-detail.html and wired to Supabase.
 */
import { useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  captainSendMessage,
  getCaptainBooking,
  markTripComplete,
  weatherCancel,
} from "@/lib/captain-booking-detail.functions";

const V = {
  serif: "'Cormorant Garamond',Georgia,serif",
  sans: "'Hanken Grotesk',system-ui,sans-serif",
  ink: "#0d2236",
  navy: "#0a2236",
  paper: "#eef2f5",
  card: "#ffffff",
  sand: "#e3c089",
  sand2: "#d2a566",
  sandsoft: "#f4e6cd",
  goldtext: "#a97e3c",
  cyan: "#1f9fbe",
  cyansoft: "#e2eef2",
  green: "#1f8a5b",
  greensoft: "#e2f2ea",
  ond: "#eaf1f6",
  ondmut: "#93a7b7",
  tmut: "#5c6b78",
  line: "rgba(13,34,54,.10)",
  lined: "rgba(255,255,255,.12)",
};

const money = (cents: number | null | undefined) =>
  `$${Math.round((cents ?? 0) / 100).toLocaleString()}`;

const initials = (name: string) => name.trim().charAt(0).toUpperCase() || "•";

function dateLine(d: string | null, t: string | null, party: number) {
  if (!d) return `Party of ${party}`;
  const date = new Date(d + "T00:00:00");
  const day = date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = t
    ? new Date(`1970-01-01T${t}`).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })
    : "";
  return `${day}${time ? " · " + time : ""} · Party of ${party}`;
}

export function CaptainBookingDetail({ bookingId }: { bookingId: string }) {
  const { data } = useSuspenseQuery({
    queryKey: ["captain-booking", bookingId],
    queryFn: () => getCaptainBooking({ data: { id: bookingId } }),
  });
  const queryClient = useQueryClient();
  const send = useServerFn(captainSendMessage);
  const doWeather = useServerFn(weatherCancel);
  const doComplete = useServerFn(markTripComplete);

  const [weatherOpen, setWeatherOpen] = useState(false);
  const [weatherChoice, setWeatherChoice] = useState<"rebook" | "cancel">("rebook");
  const [weatherNote, setWeatherNote] = useState(
    "Squall line building for midday — not safe for a party with first-timers. Let's get you back out on a clean window.",
  );
  const [toast, setToast] = useState("");
  const [reply, setReply] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (m: string) => {
    setToast(m);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2800);
  };

  const b = data.booking;
  const status = b.status;
  const isCanceled =
    status === "weather_cancelled" ||
    status === "cancelled_angler" ||
    status === "cancelled_captain" ||
    status === "refunded";
  const isRebooked = false; // no rebook schema yet — placeholder for future date change
  const isActive = !isCanceled && (status === "confirmed" || status === "pending_confirmation" || status === "in_progress");

  const angler = data.angler;
  const anglerName = angler?.display_name ?? angler?.full_name ?? "Guest";
  const service = data.service;
  const business = data.business;

  const total = b.total_cents ?? service?.base_price_cents ?? 0;
  const fee = Math.round(total * 0.1);
  const payoutCents = Math.max(0, total - fee);

  const statusLabel = isActive
    ? "Confirmed · escrow funded"
    : isCanceled
    ? "Canceled · weather"
    : status.replaceAll("_", " ");
  const statusColor = isActive ? V.green : isCanceled ? V.tmut : V.cyan;
  const statusBg = isActive ? V.greensoft : isCanceled ? "rgba(13,34,54,.06)" : V.cyansoft;

  const trip = dateLine(b.trip_date, b.start_time, b.party_size ?? 1);
  const location =
    service?.departure_location ||
    [business?.name, business?.city].filter(Boolean).join(" · ") ||
    "Departure TBD";
  const escrowHeadline = isActive
    ? `${money(payoutCents)} secured for you`
    : isCanceled
    ? "Escrow returned to guest"
    : `${money(payoutCents)} secured`;
  const payoutNote = isActive
    ? "Releases automatically when you mark the trip complete"
    : isCanceled
    ? "No payout — escrow refunded on your weather call"
    : "Released after the trip";

  const escrowSteps = useMemo(() => {
    const steps = [
      { title: "Booked & funded", desc: `${anglerName} paid ${money(total)} — held by Fish-X, not you`, state: "done" as const },
      {
        title: "In escrow",
        desc: `${money(payoutCents)} payout secured against trip completion`,
        state: isActive ? ("current" as const) : ("done" as const),
      },
      {
        title: isCanceled ? "Weather call" : "Trip day",
        desc: isCanceled
          ? "You canceled — guest refunded in full"
          : b.trip_date
          ? `${b.trip_date} · mark complete when you're back at the dock`
          : "Mark complete when you're back at the dock",
        state: isActive ? ("todo" as const) : ("done" as const),
      },
      {
        title: isCanceled ? "Escrow returned" : "Released to you",
        desc: isCanceled
          ? `${money(total)} back to guest · no rating impact`
          : `${money(payoutCents)} lands in your balance the same evening`,
        state: isActive ? ("todo" as const) : ("done" as const),
      },
    ];
    return steps;
  }, [anglerName, total, payoutCents, isActive, isCanceled, b.trip_date]);

  const doSend = async () => {
    const txt = reply.trim();
    if (!txt) return;
    setReply("");
    try {
      await send({ data: { bookingId, body: txt } });
      await queryClient.invalidateQueries({ queryKey: ["captain-booking", bookingId] });
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to send");
      setReply(txt);
    }
  };

  const confirmWeather = async () => {
    try {
      if (weatherChoice === "rebook") {
        // No rebook schema yet — send a proposal message instead of state change.
        await send({
          data: {
            bookingId,
            body: `Weather rebooking offer: ${weatherNote}\n\nOptions: Sun Jul 19 or Sat Jul 25 — escrow moves with the new date, or refund one tap away.`,
          },
        });
        setWeatherOpen(false);
        showToast("Rebooking offer sent to the guest");
      } else {
        await doWeather({ data: { bookingId, note: weatherNote } });
        setWeatherOpen(false);
        showToast(`Trip canceled — ${money(total)} refunded from escrow`);
      }
      await queryClient.invalidateQueries({ queryKey: ["captain-booking", bookingId] });
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed");
    }
  };

  const doMarkComplete = async () => {
    try {
      await doComplete({ data: { bookingId } });
      showToast(`Trip marked complete — ${money(payoutCents)} released to you`);
      await queryClient.invalidateQueries({ queryKey: ["captain-booking", bookingId] });
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed");
    }
  };

  const rebook = weatherChoice === "rebook";

  return (
    <div
      id="cap-booking"
      style={{
        minHeight: "100vh",
        background: V.paper,
        color: V.ink,
        fontFamily: V.sans,
      }}
    >
      {/* NAV */}
      <header style={{ position: "sticky", top: 0, zIndex: 30, background: V.navy, color: V.ond }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 28px", height: 62, display: "flex", alignItems: "center", gap: 22 }}>
          <Link to="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: V.ondmut, textDecoration: "none", fontSize: 13, fontWeight: 600 }}>
            <span>←</span> Bookings
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "0 auto" }}>
            <span style={{ width: 10, height: 10, background: V.sand, transform: "rotate(45deg)", display: "inline-block", borderRadius: 1 }} />
            <span style={{ fontFamily: V.serif, fontWeight: 600, fontSize: 19, letterSpacing: ".1em" }}>FISH—X</span>
          </div>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, border: `1px solid ${V.lined}`, borderRadius: 30, padding: "8px 14px", fontSize: 11.5, fontWeight: 600, color: V.ond }}>
            Captain view
          </span>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 28px 60px" }}>
        {isCanceled && (
          <div style={{ display: "flex", alignItems: "center", gap: 14, background: V.cyansoft, border: "1px solid rgba(31,159,190,.35)", borderRadius: 14, padding: "16px 18px", marginBottom: 22 }}>
            <span style={{ width: 36, height: 36, borderRadius: "50%", background: V.cyan, color: "#fff", display: "grid", placeItems: "center", fontSize: 15, flex: "none" }}>✓</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: V.ink }}>Weather call made — guest refunded</div>
              <div style={{ fontSize: 13, color: V.tmut, marginTop: 2 }}>{money(total)} returned to {anglerName} from escrow. No penalty to your rating.</div>
            </div>
          </div>
        )}

        {/* HEADER */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 20, flexWrap: "wrap", marginBottom: 24 }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".18em", textTransform: "uppercase", color: V.goldtext }}>
              Booking {b.id.slice(0, 8).toUpperCase()} · {service?.title ?? "Charter"}
            </div>
            <h1 style={{ fontFamily: V.serif, fontWeight: 600, fontSize: 38, letterSpacing: "-.01em", lineHeight: 1.05, margin: "8px 0 8px", color: V.ink }}>
              {anglerName} · party of {b.party_size ?? 1}
            </h1>
            <div style={{ fontSize: 14, color: V.tmut }}>{trip} · {location}</div>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, borderRadius: 30, padding: "9px 16px", color: statusColor, background: statusBg, textTransform: "capitalize" }}>
            {statusLabel}
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 22, alignItems: "start" }}>
          {/* MAIN COL */}
          <div style={{ display: "flex", flexDirection: "column", gap: 22, minWidth: 0 }}>
            {/* PARTY MANIFEST */}
            <section style={{ background: V.card, border: `1px solid ${V.line}`, borderRadius: 20, padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <h2 style={{ fontFamily: V.serif, fontWeight: 600, fontSize: 21, margin: 0, color: V.ink }}>Party manifest</h2>
                <span style={{ fontSize: 12, color: V.tmut }}>Lead angler confirmed</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, border: `1px solid ${V.line}`, borderRadius: 13, padding: "12px 14px" }}>
                  <span style={{ width: 36, height: 36, borderRadius: "50%", background: V.paper, border: `1px solid ${V.line}`, display: "grid", placeItems: "center", fontFamily: V.serif, fontSize: 15, fontWeight: 600, color: V.goldtext, flex: "none" }}>
                    {initials(anglerName)}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: V.ink }}>{anglerName}</div>
                    <div style={{ fontSize: 12, color: V.tmut }}>Lead angler</div>
                  </div>
                  <span style={{ color: V.green, fontSize: 13, flex: "none" }}>✓</span>
                </div>
                {Array.from({ length: Math.max(0, (b.party_size ?? 1) - 1) }).map((_, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, border: `1px solid ${V.line}`, borderRadius: 13, padding: "12px 14px" }}>
                    <span style={{ width: 36, height: 36, borderRadius: "50%", background: V.paper, border: `1px solid ${V.line}`, display: "grid", placeItems: "center", fontFamily: V.serif, fontSize: 15, fontWeight: 600, color: V.goldtext, flex: "none" }}>+</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: V.ink }}>Guest {i + 2}</div>
                      <div style={{ fontSize: 12, color: V.tmut }}>Added by lead angler</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ESCROW TIMELINE */}
            <section style={{ background: V.card, border: `1px solid ${V.line}`, borderRadius: 20, padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 20 }}>
                <span style={{ position: "relative", width: 36, height: 36, borderRadius: "50%", background: V.cyansoft, display: "grid", placeItems: "center", color: V.cyan }}>
                  <span style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `1px solid ${V.cyan}`, animation: "fx-sonar 3.2s ease-out infinite" }} />
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <rect x="4" y="10" width="16" height="11" rx="2.5" />
                    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                  </svg>
                </span>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: V.cyan }}>Your payout</div>
                  <div style={{ fontFamily: V.serif, fontSize: 19, color: V.ink }}>{escrowHeadline}</div>
                </div>
              </div>
              <div>
                {escrowSteps.map((e, i) => {
                  const done = e.state === "done";
                  const cur = e.state === "current";
                  return (
                    <div key={i} style={{ display: "flex", gap: 14 }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: "none", width: 22 }}>
                        <span style={{ width: 16, height: 16, borderRadius: "50%", background: done ? V.green : cur ? V.cyan : "#fff", border: done || cur ? 0 : `2px solid rgba(13,34,54,.18)`, display: "grid", placeItems: "center", color: "#fff", fontSize: 9, flex: "none" }}>
                          {done ? "✓" : ""}
                        </span>
                        {i < escrowSteps.length - 1 && (
                          <span style={{ width: 2, flex: 1, minHeight: 26, background: done ? V.green : "rgba(13,34,54,.12)" }} />
                        )}
                      </div>
                      <div style={{ paddingBottom: 18, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: done || cur ? V.ink : V.tmut }}>{e.title}</div>
                        <div style={{ fontSize: 12.5, color: V.tmut, marginTop: 2 }}>{e.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* MESSAGES */}
            <section style={{ background: V.card, border: `1px solid ${V.line}`, borderRadius: 20, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "16px 22px", borderBottom: `1px solid ${V.line}`, display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ width: 38, height: 38, borderRadius: "50%", background: V.paper, border: `1px solid ${V.line}`, display: "grid", placeItems: "center", fontFamily: V.serif, fontSize: 15, fontWeight: 600, color: V.goldtext }}>
                  {initials(anglerName)}
                </span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: V.ink }}>{anglerName}</div>
                  <div style={{ fontSize: 12, color: V.tmut }}>Lead angler · {b.id.slice(0, 8).toUpperCase()}</div>
                </div>
              </div>
              <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 11, background: V.paper, maxHeight: 260, overflowY: "auto" }}>
                {data.messages.length === 0 && (
                  <div style={{ fontSize: 13, color: V.tmut, fontStyle: "italic" }}>No messages yet. Say hello to your guest.</div>
                )}
                {data.messages.map((m) => {
                  const me = m.sender_id === data.viewerId;
                  return (
                    <div
                      key={m.id}
                      style={{
                        alignSelf: me ? "flex-end" : "flex-start",
                        maxWidth: "76%",
                        background: me ? V.navy : "#fff",
                        color: me ? "#fff" : V.ink,
                        border: `1px solid ${me ? V.navy : V.line}`,
                        borderRadius: 13,
                        padding: "10px 14px",
                        fontSize: 13.5,
                        lineHeight: 1.45,
                      }}
                    >
                      {m.body}
                    </div>
                  );
                })}
              </div>
              <div style={{ padding: "14px 22px", borderTop: `1px solid ${V.line}`, display: "flex", gap: 10 }}>
                <input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      doSend();
                    }
                  }}
                  placeholder="Message your guest…"
                  style={{ flex: 1, background: V.paper, border: `1px solid ${V.line}`, borderRadius: 11, padding: "12px 14px", fontFamily: V.sans, fontSize: 13.5, color: V.ink, outline: "none" }}
                />
                <button
                  onClick={doSend}
                  style={{ background: V.sand, color: "#1c1303", border: 0, borderRadius: 11, padding: "0 20px", fontFamily: V.sans, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}
                >
                  Send
                </button>
              </div>
            </section>
          </div>

          {/* RAIL */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* PAYOUT CARD */}
            <div style={{ background: "linear-gradient(160deg,#0c2a42,#0a2236)", borderRadius: 20, padding: 24, color: V.ond }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: V.sand, marginBottom: 14 }}>
                Payout on completion
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, padding: "5px 0" }}>
                <span style={{ color: V.ondmut }}>Charter total</span>
                <span style={{ color: "#fff", fontWeight: 600 }}>{money(total)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, padding: "5px 0" }}>
                <span style={{ color: V.ondmut }}>Fish-X fee (10%)</span>
                <span style={{ color: "#fff", fontWeight: 600 }}>−{money(fee)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, padding: "12px 0 0", borderTop: "1px solid rgba(255,255,255,.12)", marginTop: 8 }}>
                <span style={{ fontWeight: 700, color: "#fff" }}>You receive</span>
                <span style={{ fontFamily: V.serif, fontSize: 22, fontWeight: 600, color: V.sand }}>{money(payoutCents)}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 11, padding: "11px 13px" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: V.cyan, flex: "none" }} />
                <span style={{ fontSize: 12, color: V.ond }}>{payoutNote}</span>
              </div>
            </div>

            {/* ACTIONS */}
            {isActive && (
              <div style={{ background: V.card, border: `1px solid ${V.line}`, borderRadius: 20, padding: "10px 22px" }}>
                <button
                  onClick={doMarkComplete}
                  style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", background: "transparent", border: 0, borderBottom: `1px solid ${V.line}`, padding: "15px 0", cursor: "pointer", fontFamily: V.sans, fontSize: 13.5, fontWeight: 600, color: V.green, textAlign: "left" }}
                >
                  <span style={{ width: 32, height: 32, borderRadius: 9, background: V.greensoft, display: "grid", placeItems: "center", flex: "none" }}>✓</span>
                  Mark trip complete · release escrow
                </button>
                <button
                  onClick={() => setWeatherOpen(true)}
                  style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", background: "transparent", border: 0, padding: "15px 0", cursor: "pointer", fontFamily: V.sans, fontSize: 13.5, fontWeight: 600, color: V.goldtext, textAlign: "left" }}
                >
                  <span style={{ width: 32, height: 32, borderRadius: 9, background: V.sandsoft, display: "grid", placeItems: "center", flex: "none" }}>⚠️</span>
                  Make a weather call
                </button>
              </div>
            )}

            {/* TRUST NOTE */}
            <div style={{ background: V.card, border: `1px solid ${V.line}`, borderRadius: 20, padding: "20px 22px" }}>
              <div style={{ fontFamily: V.serif, fontSize: 16.5, color: V.ink, marginBottom: 8 }}>
                Weather calls & your rating
              </div>
              <div style={{ fontSize: 12.5, lineHeight: 1.6, color: V.tmut }}>
                Safety calls never hurt your standing. The guest is refunded in full from escrow, you keep your response
                streak, and the slot reopens on your calendar automatically.
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* WEATHER MODAL */}
      {weatherOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 70, background: "rgba(6,21,31,.55)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ width: "100%", maxWidth: 500, background: V.card, borderRadius: 22, padding: 28, boxShadow: "0 40px 90px -30px rgba(0,0,0,.6)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <h2 style={{ fontFamily: V.serif, fontWeight: 600, fontSize: 25, margin: 0, color: V.ink }}>Weather call</h2>
              <button onClick={() => setWeatherOpen(false)} style={{ width: 32, height: 32, borderRadius: "50%", border: `1px solid ${V.line}`, background: "transparent", cursor: "pointer", color: V.tmut, fontSize: 14 }}>✕</button>
            </div>
            <p style={{ fontSize: 13.5, color: V.tmut, margin: "0 0 16px", lineHeight: 1.55 }}>
              Choose how to handle {anglerName}'s party of {b.party_size ?? 1} — the {money(total)} stays in escrow until
              you decide.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
              {(["rebook", "cancel"] as const).map((choice) => {
                const on = weatherChoice === choice;
                return (
                  <button
                    key={choice}
                    onClick={() => setWeatherChoice(choice)}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      width: "100%",
                      textAlign: "left",
                      background: on ? "rgba(227,192,137,.12)" : "transparent",
                      border: `1px solid ${on ? V.sand : "rgba(13,34,54,.12)"}`,
                      borderRadius: 12,
                      padding: "14px 15px",
                      cursor: "pointer",
                      fontFamily: V.sans,
                    }}
                  >
                    <span style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${on ? V.goldtext : "rgba(13,34,54,.25)"}`, display: "grid", placeItems: "center", flex: "none", marginTop: 1 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: on ? V.goldtext : "transparent" }} />
                    </span>
                    <span>
                      <span style={{ display: "block", fontSize: 13.5, fontWeight: 700, color: V.ink }}>
                        {choice === "rebook" ? "Offer a rebooking first" : `Cancel outright — full refund`}
                      </span>
                      <span style={{ display: "block", fontSize: 12.5, color: V.tmut, marginTop: 2 }}>
                        {choice === "rebook"
                          ? "Sends the guest a proposal to move dates. Escrow stays put until they accept or you cancel."
                          : `${money(total)} returns to the guest from escrow immediately. No payout, no rating impact.`}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            <label style={{ display: "block", marginBottom: 18 }}>
              <span style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: V.tmut, marginBottom: 7 }}>
                Note to your guests
              </span>
              <textarea
                value={weatherNote}
                onChange={(e) => setWeatherNote(e.target.value)}
                rows={2}
                style={{ width: "100%", resize: "vertical", background: V.paper, border: `1px solid ${V.line}`, borderRadius: 11, padding: "12px 14px", fontFamily: V.sans, fontSize: 13.5, color: V.ink, outline: "none" }}
              />
            </label>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setWeatherOpen(false)} style={{ flex: 1, background: "transparent", border: `1px solid ${V.line}`, borderRadius: 12, padding: 14, fontFamily: V.sans, fontSize: 13, fontWeight: 600, color: V.ink, cursor: "pointer" }}>
                Hold off
              </button>
              <button onClick={confirmWeather} style={{ flex: 1, background: V.navy, color: "#fff", border: 0, borderRadius: 12, padding: 14, fontFamily: V.sans, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                {rebook ? "Send rebooking offer" : `Cancel & refund ${money(total)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", zIndex: 80, display: "flex", alignItems: "center", gap: 11, background: V.navy, color: "#fff", border: "1px solid rgba(255,255,255,.12)", borderRadius: 30, padding: "13px 22px", boxShadow: "0 20px 44px -20px rgba(0,0,0,.6)", animation: "fx-toastin .35s ease-out" }}>
          <span style={{ width: 22, height: 22, borderRadius: "50%", background: V.green, display: "grid", placeItems: "center", fontSize: 12 }}>✓</span>
          <span style={{ fontSize: 13.5, fontWeight: 600 }}>{toast}</span>
        </div>
      )}

      <style>{`
        @keyframes fx-sonar{0%{transform:scale(.7);opacity:.5}70%{opacity:0}100%{transform:scale(2.2);opacity:0}}
        @keyframes fx-toastin{0%{opacity:0;transform:translate(-50%,14px)}100%{opacity:1;transform:translate(-50%,0)}}
      `}</style>
    </div>
  );
}
