/**
 * Angler "Cancel Booking" screen. Ported from /tmp/stitch/zone2/cancel-booking.html
 * and cancel-confirmed.html (LAYOUT + COPY only) and re-skinned into the light
 * `V` palette to match ResolutionCenter.tsx. Booking state changes go through
 * the transition_booking RPC via src/lib/cancel-booking.functions.ts.
 */
import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { cancelBooking, getCancelContext } from "@/lib/cancel-booking.functions";

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
  red: "#d8514a",
  redsoft: "#fbe9e8",
  ond: "#eaf1f6",
  ondmut: "#93a7b7",
  tmut: "#5c6b78",
  line: "rgba(13,34,54,.10)",
  lined: "rgba(255,255,255,.12)",
};

const money = (cents: number | null | undefined) =>
  `$${Math.round((cents ?? 0) / 100).toLocaleString()}`;

const captainName = (
  c: { full_name?: string | null; display_name?: string | null } | null | undefined,
) => c?.display_name || c?.full_name || "the captain";

const dateLine = (d: string, t: string | null, party: number) => {
  const date = new Date(d + "T00:00:00");
  const day = date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const time = t
    ? new Date(`1970-01-01T${t}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : "";
  return `${day}${time ? " · " + time : ""} · ${party} ${party === 1 ? "angler" : "anglers"}`;
};

const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Awaiting payment",
  pending_confirmation: "Awaiting confirmation",
  confirmed: "Confirmed",
  in_progress: "Trip in progress",
  completed: "Completed",
  reviewed: "Reviewed",
  disputed: "In dispute",
  cancelled_angler: "Cancelled by you",
  cancelled_captain: "Cancelled by captain",
  expired: "Expired",
  refunded: "Refunded",
};
const statusLabel = (s: string) => STATUS_LABEL[s] ?? s.replace(/_/g, " ");

function useToast() {
  const [toast, setToast] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = (m: string) => {
    setToast(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), 2400);
  };
  return { toast, showToast };
}

function Toast({ toast }: { toast: string }) {
  if (!toast) return null;
  return (
    <div
      style={{
        position: "fixed",
        bottom: 28,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 80,
        display: "flex",
        alignItems: "center",
        gap: 11,
        background: V.navy,
        color: "#fff",
        border: "1px solid rgba(255,255,255,.12)",
        borderRadius: 30,
        padding: "13px 22px",
        boxShadow: "0 20px 44px -20px rgba(0,0,0,.6)",
      }}
    >
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: V.sand,
          color: "#1c1303",
          display: "grid",
          placeItems: "center",
          fontSize: 12,
        }}
      >
        ✓
      </span>
      <span style={{ fontSize: 13.5, fontWeight: 600 }}>{toast}</span>
    </div>
  );
}

function Shell({ children, backTo }: { children: React.ReactNode; backTo?: string }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: V.paper,
        color: V.ink,
        fontFamily: V.sans,
      }}
    >
      <header style={{ position: "sticky", top: 0, zIndex: 30, background: V.navy, color: V.ond }}>
        <div
          style={{
            maxWidth: 980,
            margin: "0 auto",
            padding: "0 28px",
            height: 62,
            display: "flex",
            alignItems: "center",
            gap: 22,
          }}
        >
          <Link
            to={backTo ?? "/dashboard"}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              color: V.ondmut,
              textDecoration: "none",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <span>←</span> Back
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "0 auto" }}>
            <span
              style={{
                width: 10,
                height: 10,
                background: V.sand,
                transform: "rotate(45deg)",
                display: "inline-block",
                borderRadius: 1,
              }}
            />
            <span style={{ fontFamily: V.serif, fontWeight: 600, fontSize: 19, letterSpacing: ".1em" }}>
              FISH—X
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: ".16em",
                textTransform: "uppercase",
                color: V.sand,
                marginLeft: 4,
              }}
            >
              Cancel Booking
            </span>
          </div>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              border: `1px solid ${V.lined}`,
              borderRadius: 30,
              padding: "8px 14px",
              fontSize: 11.5,
              fontWeight: 600,
              color: V.ond,
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: V.cyan }} /> Escrow
            protected
          </span>
        </div>
      </header>
      <main style={{ maxWidth: 980, margin: "0 auto", padding: "28px 28px 64px" }}>{children}</main>
    </div>
  );
}

export function CancelBooking({ bookingId }: { bookingId: string }) {
  const { data } = useSuspenseQuery({
    queryKey: ["cancel-booking", bookingId],
    queryFn: () => getCancelContext({ data: { bookingId } }),
  });
  const queryClient = useQueryClient();
  const { toast, showToast } = useToast();

  const cancelFn = useServerFn(cancelBooking);

  const b = data.booking;
  const capName = captainName(data.captain);
  const total = b.total_cents;
  const deposit = b.deposit_cents;

  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const cancelMut = useMutation({
    mutationFn: () => cancelFn({ data: { bookingId, reason: reason.trim() || undefined } }),
    onSuccess: () => {
      setConfirmed(true);
      showToast("Trip cancelled");
      queryClient.invalidateQueries({ queryKey: ["cancel-booking", bookingId] });
      queryClient.invalidateQueries({ queryKey: ["trip-detail", bookingId] });
      queryClient.invalidateQueries({ queryKey: ["disputable-bookings"] });
    },
    onError: (e) => showToast(e instanceof Error ? e.message : "Couldn't cancel this trip"),
  });

  const locationLine = [data.service?.departure_location, data.business?.city, data.business?.region]
    .filter(Boolean)
    .join(" · ");

  const contextCard = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        background: V.card,
        border: `1px solid ${V.line}`,
        borderRadius: 16,
        padding: "16px 20px",
        marginBottom: 24,
        flexWrap: "wrap",
      }}
    >
      <img
        src={data.service?.hero_url ?? "assets/seascape.jpg"}
        alt=""
        style={{ width: 64, height: 52, borderRadius: 10, objectFit: "cover", flex: "none" }}
      />
      <div style={{ flex: 1, minWidth: 220 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: ".14em",
            textTransform: "uppercase",
            color: V.goldtext,
          }}
        >
          Booking {b.id.slice(0, 8).toUpperCase()}
        </div>
        <div
          style={{
            fontFamily: V.serif,
            fontSize: 19,
            fontWeight: 600,
            color: V.ink,
            marginTop: 2,
          }}
        >
          {data.service?.title ?? "Charter trip"} · {capName}
        </div>
        <div style={{ fontSize: 12.5, color: V.tmut, marginTop: 2 }}>
          {dateLine(b.trip_date, b.start_time, b.party_size)}
          {locationLine ? ` · ${locationLine}` : ""}
        </div>
      </div>
      <div style={{ textAlign: "right", flex: "none" }}>
        <div style={{ fontFamily: V.serif, fontSize: 22, fontWeight: 600, color: V.cyan }}>
          {money(total)}
        </div>
        <div style={{ fontSize: 11.5, color: V.tmut }}>held in escrow</div>
      </div>
    </div>
  );

  // -------- Confirmed state (cancel-confirmed.html) --------
  if (confirmed) {
    return (
      <Shell backTo="/dashboard">
        <div style={{ maxWidth: 620, margin: "0 auto", textAlign: "center" }}>
          <div
            style={{
              width: 84,
              height: 84,
              borderRadius: "50%",
              background: V.greensoft,
              border: `2px solid ${V.green}`,
              display: "grid",
              placeItems: "center",
              margin: "8px auto 22px",
            }}
          >
            <span style={{ color: V.green, fontSize: 38 }}>✓</span>
          </div>
          <h1
            style={{
              fontFamily: V.serif,
              fontWeight: 600,
              fontSize: 34,
              letterSpacing: "-.01em",
              margin: "0 0 12px",
              color: V.ink,
            }}
          >
            Booking cancelled
          </h1>
          <div style={{ maxWidth: 480, margin: "0 auto 28px" }}>
            <p style={{ fontSize: 15, lineHeight: 1.6, color: V.tmut, margin: "0 0 8px" }}>
              Your {money(total)} stays protected in escrow — any eligible refund is released per the
              cancellation policy and reaches your original payment method in 5–10 business days.
            </p>
            <p style={{ fontSize: 13, fontStyle: "italic", color: V.ondmut, margin: 0 }}>
              A confirmation has been sent to your primary email with full details.
            </p>
          </div>

          {/* Transaction details card */}
          <div
            style={{
              background: V.card,
              border: `1px solid ${V.line}`,
              borderRadius: 18,
              padding: 24,
              marginBottom: 28,
              textAlign: "left",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 20,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: ".14em",
                  textTransform: "uppercase",
                  color: V.goldtext,
                  marginBottom: 6,
                }}
              >
                Charter
              </div>
              <div style={{ fontFamily: V.serif, fontSize: 18, fontWeight: 600, color: V.ink }}>
                {data.service?.title ?? "Charter trip"}
              </div>
              <div style={{ fontSize: 12.5, color: V.tmut, marginTop: 2 }}>
                {capName}
                {locationLine ? ` · ${locationLine}` : ""}
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: ".14em",
                  textTransform: "uppercase",
                  color: V.goldtext,
                  marginBottom: 6,
                }}
              >
                Original date
              </div>
              <div style={{ fontFamily: V.serif, fontSize: 18, fontWeight: 600, color: V.ink }}>
                {new Date(b.trip_date + "T00:00:00").toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
              <div style={{ fontSize: 12.5, color: V.tmut, marginTop: 2 }}>
                Booking #{b.id.slice(0, 8).toUpperCase()}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap" }}>
            <Link
              to="/dashboard"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: V.navy,
                color: "#fff",
                textDecoration: "none",
                borderRadius: 30,
                padding: "14px 26px",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              Back to trips <span>→</span>
            </Link>
            <Link
              to="/resolution-center"
              search={{ booking: b.id }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "transparent",
                color: V.tmut,
                textDecoration: "none",
                borderRadius: 30,
                padding: "14px 22px",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Contact support
            </Link>
          </div>
        </div>
        <Toast toast={toast} />
      </Shell>
    );
  }

  // -------- Not cancellable panel --------
  if (!data.cancellable) {
    return (
      <Shell backTo="/dashboard">
        {contextCard}
        <div style={{ maxWidth: 620, margin: "0 auto" }}>
          <div
            style={{
              background: V.card,
              border: `1px solid ${V.line}`,
              borderRadius: 20,
              padding: "36px 28px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: V.cyansoft,
                display: "grid",
                placeItems: "center",
                margin: "0 auto 16px",
              }}
            >
              <span style={{ color: V.cyan, fontSize: 26 }}>🔒</span>
            </div>
            <h1
              style={{
                fontFamily: V.serif,
                fontWeight: 600,
                fontSize: 26,
                letterSpacing: "-.01em",
                margin: "0 0 8px",
                color: V.ink,
              }}
            >
              This booking can’t be cancelled
            </h1>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: V.tmut, margin: "0 0 6px" }}>
              This trip is currently{" "}
              <b style={{ color: V.ink }}>{statusLabel(b.status).toLowerCase()}</b>, so self-service
              cancellation is no longer available.
            </p>
            <p style={{ fontSize: 13.5, lineHeight: 1.6, color: V.tmut, margin: "0 0 20px" }}>
              If something went wrong with the trip, you can open a case in the Resolution Center and
              your money stays safe in escrow throughout.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap" }}>
              <Link
                to="/resolution-center"
                search={{ booking: b.id }}
                style={{
                  background: V.navy,
                  color: "#fff",
                  textDecoration: "none",
                  borderRadius: 12,
                  padding: "13px 22px",
                  fontSize: 12.5,
                  fontWeight: 700,
                }}
              >
                Open a case
              </Link>
              <Link
                to="/dashboard"
                style={{
                  background: "transparent",
                  color: V.ink,
                  textDecoration: "none",
                  border: `1px solid ${V.line}`,
                  borderRadius: 12,
                  padding: "13px 22px",
                  fontSize: 12.5,
                  fontWeight: 600,
                }}
              >
                Back to trips
              </Link>
            </div>
          </div>
        </div>
        <Toast toast={toast} />
      </Shell>
    );
  }

  // -------- Cancel confirmation UI (cancel-booking.html) --------
  const policy = b.cancellation_policy as
    | { summary?: string; description?: string; label?: string }
    | null;
  const policyNote =
    (policy && (policy.summary || policy.description || policy.label)) ||
    "Any eligible refund follows this booking’s cancellation policy.";

  return (
    <Shell backTo="/dashboard">
      {contextCard}
      <div style={{ maxWidth: 620, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <h1
            style={{
              fontFamily: V.serif,
              fontWeight: 600,
              fontSize: 30,
              letterSpacing: "-.01em",
              margin: "0 0 8px",
              color: V.ink,
            }}
          >
            Cancel this trip?
          </h1>
          <p style={{ fontSize: 14, color: V.tmut, margin: "0 auto", maxWidth: 440, lineHeight: 1.6 }}>
            We’re sorry to see you go. Review the details below before you finalize your cancellation.
          </p>
        </div>

        <div
          style={{
            background: V.card,
            border: `1px solid ${V.line}`,
            borderRadius: 20,
            padding: 26,
            display: "flex",
            flexDirection: "column",
            gap: 22,
          }}
        >
          {/* Policy section */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 14,
              background: V.cyansoft,
              border: `1px solid ${V.line}`,
              borderRadius: 14,
              padding: "16px 18px",
            }}
          >
            <span
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: "#fff",
                display: "grid",
                placeItems: "center",
                color: V.cyan,
                fontSize: 16,
                flex: "none",
              }}
            >
              🛡
            </span>
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: ".14em",
                  textTransform: "uppercase",
                  color: V.cyan,
                  marginBottom: 3,
                }}
              >
                Cancellation policy
              </div>
              <div style={{ fontSize: 13.5, lineHeight: 1.55, color: V.ink }}>{policyNote}</div>
            </div>
          </div>

          {/* Amounts */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-around",
              gap: 16,
              padding: "18px 0",
              borderTop: `1px solid ${V.line}`,
              borderBottom: `1px solid ${V.line}`,
              textAlign: "center",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: ".12em",
                  textTransform: "uppercase",
                  color: V.tmut,
                  marginBottom: 6,
                }}
              >
                In escrow
              </div>
              <div style={{ fontFamily: V.serif, fontSize: 26, fontWeight: 600, color: V.ink }}>
                {money(total)}
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: ".12em",
                  textTransform: "uppercase",
                  color: V.tmut,
                  marginBottom: 6,
                }}
              >
                Deposit
              </div>
              <div style={{ fontFamily: V.serif, fontSize: 26, fontWeight: 600, color: V.goldtext }}>
                {money(deposit)}
              </div>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: ".14em",
                textTransform: "uppercase",
                color: V.goldtext,
                marginBottom: 10,
              }}
            >
              Reason · optional
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Let the captain know why you’re cancelling (weather, scheduling, rebooking, etc.)…"
              style={{
                width: "100%",
                resize: "vertical",
                background: V.paper,
                border: `1px solid ${V.line}`,
                borderRadius: 13,
                padding: "14px 16px",
                fontFamily: V.sans,
                fontSize: 14,
                lineHeight: 1.55,
                color: V.ink,
                outline: "none",
              }}
            />
          </div>

          {/* Warning */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              color: V.red,
            }}
          >
            <span style={{ fontSize: 16 }}>⚠</span>
            <span style={{ fontSize: 12.5, color: V.tmut }}>
              This action is permanent and can’t be reversed.
            </span>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button
              onClick={() => cancelMut.mutate()}
              disabled={cancelMut.isPending}
              style={{
                width: "100%",
                background: V.red,
                color: "#fff",
                border: 0,
                borderRadius: 12,
                padding: 16,
                fontFamily: V.sans,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: ".06em",
                textTransform: "uppercase",
                cursor: "pointer",
                opacity: cancelMut.isPending ? 0.6 : 1,
              }}
            >
              {cancelMut.isPending ? "Cancelling…" : "Cancel this trip"}
            </button>
            <Link
              to="/dashboard"
              style={{
                width: "100%",
                textAlign: "center",
                boxSizing: "border-box",
                background: V.redsoft,
                color: V.ink,
                textDecoration: "none",
                border: `1px solid ${V.line}`,
                borderRadius: 12,
                padding: 16,
                fontFamily: V.sans,
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              Keep my booking
            </Link>
          </div>
        </div>

        <p
          style={{
            textAlign: "center",
            marginTop: 20,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: ".08em",
            textTransform: "uppercase",
            color: V.ondmut,
          }}
        >
          Transaction {b.id.slice(0, 8).toUpperCase()}-CXL
        </p>
      </div>
      <Toast toast={toast} />
    </Shell>
  );
}
