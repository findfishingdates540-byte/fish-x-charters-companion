/**
 * Angler Messages screen — a two-pane inbox (thread list + open thread) wired to
 * live booking_messages via src/lib/messages.functions.ts. Layout/copy ported
 * from the Zone 2 stitch, re-skinned into the light `V` palette so it matches
 * ResolutionCenter.tsx. No Tailwind, no icon fonts — inline styles + emoji only.
 */
import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getThread,
  listMessageThreads,
  markThreadRead,
  sendMessage,
} from "@/lib/messages.functions";

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

const captainName = (
  c: { full_name?: string | null; display_name?: string | null } | null | undefined,
) => c?.display_name || c?.full_name || "the captain";

/** Counterpart shown for a thread: the business name, falling back to captain. */
const counterpartName = (
  business: { name?: string | null } | null | undefined,
  captain: { full_name?: string | null; display_name?: string | null } | null | undefined,
) => business?.name || captainName(captain);

const relativeTime = (iso: string | null | undefined) => {
  if (!iso) return "";
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const min = Math.round(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(then).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

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

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: V.paper, color: V.ink, fontFamily: V.sans }}>
      <header style={{ position: "sticky", top: 0, zIndex: 30, background: V.navy, color: V.ond }}>
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "0 28px",
            height: 62,
            display: "flex",
            alignItems: "center",
            gap: 22,
          }}
        >
          <Link
            to="/dashboard"
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
            <span
              style={{ fontFamily: V.serif, fontWeight: 600, fontSize: 19, letterSpacing: ".1em" }}
            >
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
              Messages
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
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: V.cyan }} /> One
            thread per trip
          </span>
        </div>
      </header>
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 28px 64px" }}>{children}</main>
    </div>
  );
}

const avatarInitial = (label: string) => (label.trim()[0] ?? "C").toUpperCase();

function CounterpartAvatar({
  url,
  label,
  size,
}: {
  url: string | null | undefined;
  label: string;
  size: number;
}) {
  if (url) {
    return (
      <img
        src={url}
        alt=""
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flex: "none" }}
      />
    );
  }
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: V.sandsoft,
        display: "grid",
        placeItems: "center",
        fontFamily: V.serif,
        fontSize: size * 0.42,
        fontWeight: 600,
        color: V.goldtext,
        flex: "none",
      }}
    >
      {avatarInitial(label)}
    </span>
  );
}

/* ------------------------------------------------------------- Thread list -- */

function ThreadList({ activeId }: { activeId: string | null }) {
  const { data } = useSuspenseQuery({
    queryKey: ["message-threads"],
    queryFn: () => listMessageThreads(),
  });

  return (
    <aside
      style={{
        background: V.card,
        border: `1px solid ${V.line}`,
        borderRadius: 20,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ padding: "20px 22px", borderBottom: `1px solid ${V.line}` }}>
        <h1
          style={{
            fontFamily: V.serif,
            fontWeight: 600,
            fontSize: 24,
            letterSpacing: "-.01em",
            margin: 0,
            color: V.ink,
          }}
        >
          Messages
        </h1>
        <p style={{ fontSize: 12.5, color: V.tmut, margin: "4px 0 0" }}>
          Your conversations with each captain — one per booking.
        </p>
      </div>

      {data.threads.length === 0 ? (
        <div style={{ padding: "48px 26px", textAlign: "center" }}>
          <div
            style={{
              width: 84,
              height: 84,
              borderRadius: "50%",
              background: V.cyansoft,
              display: "grid",
              placeItems: "center",
              margin: "0 auto 18px",
              fontSize: 32,
            }}
          >
            💬
          </div>
          <div style={{ fontFamily: V.serif, fontSize: 22, color: V.ink, marginBottom: 8 }}>
            No messages yet
          </div>
          <p style={{ fontSize: 13.5, color: V.tmut, lineHeight: 1.6, margin: "0 auto 22px", maxWidth: 320 }}>
            Book a charter to start a conversation with a captain.
          </p>
          <Link
            to="/dashboard"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: V.sand,
              color: "#1c1303",
              textDecoration: "none",
              borderRadius: 30,
              padding: "13px 24px",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: ".08em",
              textTransform: "uppercase",
            }}
          >
            Explore charters <span>→</span>
          </Link>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: "auto", maxHeight: "70vh" }}>
          {data.threads.map((t) => {
            const active = t.booking.id === activeId;
            const name = counterpartName(t.business, t.captain);
            const snippet = t.lastMessage?.body?.trim() || "No messages yet";
            return (
              <Link
                key={t.booking.id}
                to="/messages"
                search={{ booking: t.booking.id }}
                style={{
                  display: "flex",
                  gap: 14,
                  padding: "16px 20px",
                  textDecoration: "none",
                  color: V.ink,
                  borderBottom: `1px solid ${V.line}`,
                  borderLeft: `3px solid ${active ? V.sand : "transparent"}`,
                  background: active ? V.sandsoft : "transparent",
                }}
              >
                <CounterpartAvatar url={t.captain?.avatar_url} label={name} size={46} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: V.ink,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {name}
                    </span>
                    <span style={{ fontSize: 11, color: V.tmut, flex: "none" }}>
                      {relativeTime(t.lastMessage?.created_at)}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 12.5,
                      color: V.tmut,
                      marginTop: 3,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {snippet}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginTop: 8,
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        borderRadius: 30,
                        background: V.cyansoft,
                        border: `1px solid ${V.line}`,
                        padding: "2px 9px",
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: ".06em",
                        textTransform: "uppercase",
                        color: V.cyan,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: "70%",
                      }}
                    >
                      {t.service?.title ?? "Charter trip"}
                    </span>
                    {t.unread > 0 && (
                      <span
                        style={{
                          marginLeft: "auto",
                          minWidth: 20,
                          height: 20,
                          borderRadius: 20,
                          background: V.sand,
                          color: "#1c1303",
                          display: "grid",
                          placeItems: "center",
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "0 6px",
                          flex: "none",
                        }}
                      >
                        {t.unread}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </aside>
  );
}

/* -------------------------------------------------------------- Thread view -- */

function ThreadView({ bookingId }: { bookingId: string }) {
  const { data } = useSuspenseQuery({
    queryKey: ["thread", bookingId],
    queryFn: () => getThread({ data: { bookingId } }),
  });
  const queryClient = useQueryClient();
  const { toast, showToast } = useToast();

  const sendFn = useServerFn(sendMessage);
  const markReadFn = useServerFn(markThreadRead);

  const [draft, setDraft] = useState("");

  const name = counterpartName(data.business, data.captain);
  const capName = captainName(data.captain);

  // Fire-and-forget read receipts when this thread opens / changes.
  useEffect(() => {
    let cancelled = false;
    markReadFn({ data: { bookingId } })
      .then(() => {
        if (!cancelled) queryClient.invalidateQueries({ queryKey: ["message-threads"] });
      })
      .catch(() => {
        /* best-effort */
      });
    return () => {
      cancelled = true;
    };
  }, [bookingId, markReadFn, queryClient]);

  const sendMut = useMutation({
    mutationFn: (body: string) => sendFn({ data: { bookingId, body } }),
    onSuccess: () => {
      setDraft("");
      queryClient.invalidateQueries({ queryKey: ["thread", bookingId] });
      queryClient.invalidateQueries({ queryKey: ["message-threads"] });
    },
    onError: (e) => showToast(e instanceof Error ? e.message : "Couldn't send"),
  });

  const submit = () => {
    const body = draft.trim();
    if (!body || sendMut.isPending) return;
    sendMut.mutate(body);
  };

  // Group messages by calendar day for the date separators.
  let lastDay = "";

  return (
    <section
      style={{
        background: V.card,
        border: `1px solid ${V.line}`,
        borderRadius: 20,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
      }}
    >
      {/* Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "16px 22px",
          borderBottom: `1px solid ${V.line}`,
        }}
      >
        <CounterpartAvatar url={data.captain?.avatar_url} label={name} size={42} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: V.serif,
              fontSize: 18,
              fontWeight: 600,
              color: V.ink,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {name}
          </div>
          <div style={{ fontSize: 12, color: V.tmut, marginTop: 1 }}>
            {data.service?.title ?? "Charter trip"} · {capName}
          </div>
        </div>
        <Link
          to="/resolution-center"
          search={{ booking: bookingId }}
          style={{
            flex: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            border: `1px solid ${V.line}`,
            borderRadius: 30,
            padding: "8px 14px",
            fontSize: 11.5,
            fontWeight: 600,
            color: V.ink,
            textDecoration: "none",
          }}
        >
          ⚑ Resolution
        </Link>
      </header>

      {/* Body */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          maxHeight: "56vh",
          padding: "20px 22px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          background: V.paper,
        }}
      >
        {data.messages.length === 0 && (
          <div style={{ textAlign: "center", color: V.tmut, fontSize: 13, padding: "24px 0" }}>
            No messages in this thread yet. Say hello to {capName}.
          </div>
        )}
        {data.messages.map((m) => {
          const mine = m.sender_id === data.viewerId;
          const day = dayLabel(m.created_at);
          const showDay = day !== lastDay;
          lastDay = day;
          return (
            <div key={m.id} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {showDay && (
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <span
                    style={{
                      background: V.card,
                      border: `1px solid ${V.line}`,
                      borderRadius: 30,
                      padding: "4px 12px",
                      fontSize: 10.5,
                      fontWeight: 700,
                      letterSpacing: ".06em",
                      textTransform: "uppercase",
                      color: V.tmut,
                    }}
                  >
                    {day}
                  </span>
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  flexDirection: mine ? "row-reverse" : "row",
                  alignItems: "flex-end",
                  gap: 10,
                  maxWidth: "82%",
                  marginLeft: mine ? "auto" : 0,
                  marginRight: mine ? 0 : "auto",
                }}
              >
                {!mine && <CounterpartAvatar url={data.captain?.avatar_url} label={name} size={30} />}
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      background: mine ? V.navy : V.card,
                      color: mine ? "#fff" : V.ink,
                      border: mine ? "0" : `1px solid ${V.line}`,
                      borderRadius: 16,
                      borderTopRightRadius: mine ? 4 : 16,
                      borderTopLeftRadius: mine ? 16 : 4,
                      padding: "11px 15px",
                      fontSize: 14,
                      lineHeight: 1.55,
                      whiteSpace: "pre-wrap",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {m.body}
                  </div>
                  <div
                    style={{
                      fontSize: 10.5,
                      color: V.tmut,
                      marginTop: 4,
                      textAlign: mine ? "right" : "left",
                    }}
                  >
                    {timeLabel(m.created_at)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Composer */}
      <div
        style={{
          padding: "14px 18px",
          borderTop: `1px solid ${V.line}`,
          display: "flex",
          gap: 10,
          alignItems: "flex-end",
        }}
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={1}
          placeholder="Type a message…"
          style={{
            flex: 1,
            resize: "none",
            minHeight: 44,
            maxHeight: 120,
            background: V.paper,
            border: `1px solid ${V.line}`,
            borderRadius: 14,
            padding: "12px 15px",
            fontFamily: V.sans,
            fontSize: 14,
            lineHeight: 1.5,
            color: V.ink,
            outline: "none",
          }}
        />
        <button
          onClick={submit}
          disabled={sendMut.isPending || !draft.trim()}
          style={{
            flex: "none",
            background: V.sand,
            color: "#1c1303",
            border: 0,
            borderRadius: 14,
            padding: "0 22px",
            height: 44,
            fontFamily: V.sans,
            fontSize: 12.5,
            fontWeight: 700,
            cursor: "pointer",
            opacity: sendMut.isPending || !draft.trim() ? 0.6 : 1,
          }}
        >
          {sendMut.isPending ? "Sending…" : "Send"}
        </button>
      </div>
      <Toast toast={toast} />
    </section>
  );
}

/* ------------------------------------------------------------- Placeholder -- */

function ThreadPlaceholder() {
  return (
    <section
      style={{
        background: V.card,
        border: `1px solid ${V.line}`,
        borderRadius: 20,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "60px 30px",
        minHeight: 360,
      }}
    >
      <div
        style={{
          width: 90,
          height: 90,
          borderRadius: "50%",
          background: V.cyansoft,
          display: "grid",
          placeItems: "center",
          marginBottom: 20,
          fontSize: 34,
        }}
      >
        ⚓
      </div>
      <div style={{ fontFamily: V.serif, fontSize: 23, color: V.ink, marginBottom: 8 }}>
        Select a conversation
      </div>
      <p style={{ fontSize: 13.5, color: V.tmut, lineHeight: 1.6, margin: 0, maxWidth: 340 }}>
        Pick a trip on the left to read the thread and message your captain. Everything stays tied to
        that booking.
      </p>
    </section>
  );
}

/* ---------------------------------------------------------------- Screen --- */

export function Messages({ bookingId }: { bookingId: string | null }) {
  return (
    <Shell>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(300px, 380px) 1fr",
          gap: 22,
          alignItems: "start",
        }}
      >
        <ThreadList activeId={bookingId} />
        {bookingId ? <ThreadView key={bookingId} bookingId={bookingId} /> : <ThreadPlaceholder />}
      </div>
    </Shell>
  );
}
