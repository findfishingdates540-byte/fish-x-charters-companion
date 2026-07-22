import { useState } from "react";
import {
  useSuspenseQuery,
  useMutation,
  useQueryClient,
  queryOptions,
} from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getGuideOverview,
  assignGuideToBooking,
  upsertGuideSlot,
  deleteGuideSlot,
} from "@/lib/guide.functions";
import {
  OperatorShell,
  OperatorNavItem,
  KPICard,
  Card,
  StatusPill,
  money,
} from "@/components/operator/OperatorShell";

const overviewQO = (businessId: string) =>
  queryOptions({
    queryKey: ["guide-overview", businessId],
    queryFn: () => getGuideOverview({ data: { businessId } }),
  });

type Slot = {
  id: string;
  service_id: string | null;
  slot_date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  booked_count: number;
  price_cents: number;
  status: string;
  notes: string | null;
};

export function GuideDashboard({
  businessId,
  workspaceName,
  operatorName,
}: {
  businessId: string;
  workspaceName: string;
  operatorName: string;
}) {
  const { data } = useSuspenseQuery(overviewQO(businessId));
  const [active, setActive] = useState("overview");

  const nav: OperatorNavItem[] = [
    { key: "overview", label: "Overview", icon: <BoxIcon /> },
    {
      key: "trips",
      label: "Trips",
      icon: <CalIcon />,
      badge: data.kpis.unassignedCount || undefined,
    },
    { key: "guides", label: "Guides", icon: <TeamIcon /> },
    { key: "slots", label: "Availability", icon: <ClockIcon /> },
    {
      key: "requests",
      label: "Requests",
      icon: <InboxIcon />,
      badge: data.requests.length || undefined,
    },
  ];

  const titles: Record<string, { t: string; s: string }> = {
    overview: {
      t: "Overview",
      s: `Morning, ${operatorName} — ${data.kpis.rosterCount} guides on your roster.`,
    },
    trips: { t: "Trips", s: "Assignment board — escrow-funded bookings." },
    guides: { t: "Guides", s: "Your roster & performance." },
    slots: { t: "Availability", s: "Bookable slots across your services." },
    requests: { t: "Requests", s: "New bookings waiting on you." },
  };

  return (
    <OperatorShell
      workspaceName={workspaceName}
      workspaceKind="Guide Service"
      operatorName={operatorName}
      operatorRole="Owner · Verified outfitter"
      nav={nav}
      active={active}
      onNav={setActive}
      pageTitle={titles[active].t}
      pageSub={titles[active].s}
    >
      {active === "overview" && <Overview data={data} />}
      {active === "trips" && <Trips businessId={businessId} data={data} />}
      {active === "guides" && <Roster data={data} />}
      {active === "slots" && <Slots businessId={businessId} data={data} />}
      {active === "requests" && <Requests businessId={businessId} data={data} />}
    </OperatorShell>
  );
}

function Overview({ data }: { data: any }) {
  const k = data.kpis;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 18 }}>
        <KPICard label="Month gross" value={money(k.monthGrossCents)} trend="MTD" />
        <KPICard label="This week" value={`${k.weekTripsCount} trips`} />
        <KPICard label="In escrow" value={money(k.escrowCents)} />
        <KPICard
          label="Unassigned"
          value={String(k.unassignedCount)}
          trend={k.unassignedCount ? "action" : "clear"}
          trendPositive={k.unassignedCount === 0}
        />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 18 }}>
        <Card eyebrow="Fulfillment" title="Upcoming trips">
          <TripList rows={data.trips.slice(0, 6)} minimal />
        </Card>
        <Card eyebrow="This month" title="Guide load">
          {data.roster.length === 0 ? (
            <Empty label="No guides on your roster yet." />
          ) : (
            data.roster.map((g: any) => {
              const max = Math.max(
                1,
                ...data.roster.map((r: any) => r.tripsCount),
              );
              const pct = Math.round((g.tripsCount / max) * 100);
              return (
                <div key={g.userId} style={{ marginBottom: 14 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 13,
                      marginBottom: 7,
                    }}
                  >
                    <span style={{ fontWeight: 600, color: "#0d2236" }}>{g.name}</span>
                    <span style={{ color: "#5c6b78" }}>{g.tripsCount} trips</span>
                  </div>
                  <div
                    style={{
                      height: 8,
                      borderRadius: 8,
                      background: "#eef2f5",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${pct}%`,
                        height: "100%",
                        background: "linear-gradient(90deg,#e3c089,#d2a566)",
                      }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </Card>
      </div>
    </div>
  );
}

function Trips({ businessId, data }: { businessId: string; data: any }) {
  return (
    <Card title="Assignment board">
      <TripList rows={data.trips} businessId={businessId} roster={data.roster} />
    </Card>
  );
}

function TripList({
  rows,
  businessId,
  roster,
  minimal,
}: {
  rows: any[];
  businessId?: string;
  roster?: any[];
  minimal?: boolean;
}) {
  const qc = useQueryClient();
  const assignFn = useServerFn(assignGuideToBooking);
  const assignM = useMutation({
    mutationFn: assignFn,
    onSuccess: () =>
      businessId &&
      qc.invalidateQueries({ queryKey: ["guide-overview", businessId] }),
  });

  if (!rows.length) return <Empty label="No trips yet." />;

  const toneFor = (s: string) =>
    s === "completed" || s === "reviewed"
      ? "green"
      : s === "confirmed" || s === "in_progress"
        ? "cyan"
        : s === "inquiry" || s === "pending_confirmation" || s === "pending_payment"
          ? "gold"
          : "muted";

  return (
    <div>
      {rows.map((t) => {
        const assigned = !!t.assigned_guide_id;
        const anglerName = t.angler?.display_name || t.angler?.full_name || "Angler";
        return (
          <div
            key={t.id}
            style={{
              display: "grid",
              gridTemplateColumns: minimal
                ? "1.6fr 1fr auto"
                : "1.4fr 1fr .7fr .8fr 1.2fr",
              gap: 14,
              padding: "14px 4px",
              borderBottom: "1px solid rgba(13,34,54,.06)",
              alignItems: "center",
              background: !assigned && !minimal ? "rgba(227,192,137,.06)" : "transparent",
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#0d2236" }}>
                {anglerName}
              </div>
              <div style={{ fontSize: 12.5, color: "#5c6b78" }}>
                {t.party_size} anglers
                {t.notes ? ` · ${t.notes.slice(0, 40)}` : ""}
              </div>
            </div>
            <span style={{ fontSize: 13, color: "#0d2236" }}>
              {t.trip_date} · {t.start_time?.slice(0, 5) ?? ""}
            </span>
            {!minimal && (
              <span
                style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontSize: 17,
                  fontWeight: 600,
                  color: "#0d2236",
                }}
              >
                {money(t.total_cents ?? 0)}
              </span>
            )}
            <StatusPill label={t.status} tone={toneFor(t.status) as any} />
            {!minimal && businessId && roster && (
              <select
                value={t.assigned_guide_id ?? ""}
                onChange={(e) =>
                  assignM.mutate({
                    data: {
                      bookingId: t.id,
                      businessId,
                      guideId: e.target.value || null,
                    },
                  })
                }
                style={{
                  appearance: "none",
                  background: assigned ? "#fff" : "#f4e6cd",
                  border: `1px solid ${assigned ? "rgba(13,34,54,.14)" : "#d2a566"}`,
                  borderRadius: 10,
                  padding: "9px 12px",
                  fontFamily: "inherit",
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: assigned ? "#0d2236" : "#a97e3c",
                  cursor: "pointer",
                }}
              >
                <option value="">Assign a guide…</option>
                {roster.map((g) => (
                  <option key={g.userId} value={g.userId}>
                    {g.name}
                  </option>
                ))}
              </select>
            )}
            {minimal && (
              <StatusPill
                label={assigned ? t.guide?.display_name ?? t.guide?.full_name ?? "Assigned" : "Needs guide"}
                tone={assigned ? "green" : "gold"}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Roster({ data }: { data: any }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }}>
      {data.roster.length === 0 && (
        <Card title="No guides yet">
          <p style={{ color: "#5c6b78", fontSize: 14, margin: 0 }}>
            Invite guides from your business settings — they'll appear here with live trip counts.
          </p>
        </Card>
      )}
      {data.roster.map((g: any) => (
        <div
          key={g.userId}
          style={{
            background: "#fff",
            border: "1px solid rgba(13,34,54,.10)",
            borderRadius: 18,
            padding: 22,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
            <span
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: g.avatarUrl ? `url(${g.avatarUrl}) center/cover` : "#eef2f5",
                border: "1px solid rgba(13,34,54,.10)",
                display: "grid",
                placeItems: "center",
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: 20,
                fontWeight: 600,
                color: "#a97e3c",
                flex: "none",
              }}
            >
              {!g.avatarUrl && g.name.charAt(0)}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#0d2236" }}>{g.name}</div>
              <div style={{ fontSize: 12.5, color: "#5c6b78", textTransform: "capitalize" }}>
                {g.role}
              </div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              gap: 18,
              padding: "14px 0 0",
              borderTop: "1px solid rgba(13,34,54,.06)",
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontSize: 19,
                  fontWeight: 600,
                  color: "#0d2236",
                }}
              >
                {g.tripsCount}
              </div>
              <div style={{ fontSize: 11, color: "#5c6b78" }}>trips assigned</div>
            </div>
            <div style={{ borderLeft: "1px solid rgba(13,34,54,.06)", paddingLeft: 18 }}>
              <div
                style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontSize: 19,
                  fontWeight: 600,
                  color: "#0d2236",
                }}
              >
                {money(g.monthEarningsCents)}
              </div>
              <div style={{ fontSize: 11, color: "#5c6b78" }}>booked MTD</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Slots({ businessId, data }: { businessId: string; data: any }) {
  const qc = useQueryClient();
  const upsertFn = useServerFn(upsertGuideSlot);
  const deleteFn = useServerFn(deleteGuideSlot);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Slot | null>(null);

  const upsertM = useMutation({
    mutationFn: upsertFn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["guide-overview", businessId] });
      setShowForm(false);
      setEditing(null);
    },
  });
  const deleteM = useMutation({
    mutationFn: deleteFn,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["guide-overview", businessId] }),
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Card
        title="Bookable slots"
        right={
          <button
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            style={btnPrimary}
          >
            + Add slot
          </button>
        }
      >
        {data.slots.length === 0 ? (
          <Empty label="No availability yet — add your first slot." />
        ) : (
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr .8fr .6fr .6fr .8fr .4fr",
                gap: 14,
                padding: "10px 4px 12px",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: ".1em",
                textTransform: "uppercase",
                color: "#5c6b78",
                borderBottom: "1px solid rgba(13,34,54,.10)",
              }}
            >
              <span>Date</span>
              <span>Time</span>
              <span>Capacity</span>
              <span>Price</span>
              <span>Status</span>
              <span></span>
            </div>
            {data.slots.map((s: Slot) => (
              <div
                key={s.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr .8fr .6fr .6fr .8fr .4fr",
                  gap: 14,
                  padding: "14px 4px",
                  borderBottom: "1px solid rgba(13,34,54,.06)",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 600, color: "#0d2236" }}>
                  {s.slot_date}
                </span>
                <span style={{ fontSize: 13, color: "#0d2236" }}>
                  {s.start_time?.slice(0, 5)} – {s.end_time?.slice(0, 5)}
                </span>
                <span style={{ fontSize: 13, color: "#0d2236" }}>
                  {s.booked_count}/{s.capacity}
                </span>
                <span
                  style={{
                    fontFamily: "'Cormorant Garamond', Georgia, serif",
                    fontSize: 16,
                    fontWeight: 600,
                    color: "#0d2236",
                  }}
                >
                  {money(s.price_cents)}
                </span>
                <StatusPill
                  label={s.status}
                  tone={
                    s.status === "open" ? "green" : s.status === "held" ? "gold" : "muted"
                  }
                />
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                  <button
                    onClick={() => {
                      setEditing(s);
                      setShowForm(true);
                    }}
                    style={{ ...btnGhost, padding: "6px 10px", fontSize: 12 }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() =>
                      deleteM.mutate({ data: { id: s.id, businessId } })
                    }
                    style={{
                      ...btnGhost,
                      padding: "6px 10px",
                      fontSize: 12,
                      color: "#d8514a",
                      borderColor: "#fbe9e8",
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {showForm && (
        <SlotForm
          initial={editing ?? undefined}
          saving={upsertM.isPending}
          onCancel={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSave={(v) =>
            upsertM.mutate({ data: { ...v, businessId, id: editing?.id } })
          }
        />
      )}
    </div>
  );
}

function SlotForm({
  initial,
  onCancel,
  onSave,
  saving,
}: {
  initial?: Slot;
  onCancel: () => void;
  onSave: (v: {
    slotDate: string;
    startTime: string;
    endTime: string;
    capacity: number;
    priceCents: number;
    status: "open" | "held" | "closed";
    notes: string;
  }) => void;
  saving: boolean;
}) {
  const [slotDate, setSlotDate] = useState(initial?.slot_date ?? "");
  const [startTime, setStartTime] = useState(initial?.start_time?.slice(0, 5) ?? "06:00");
  const [endTime, setEndTime] = useState(initial?.end_time?.slice(0, 5) ?? "12:00");
  const [capacity, setCapacity] = useState(String(initial?.capacity ?? 4));
  const [price, setPrice] = useState(
    initial ? String((initial.price_cents ?? 0) / 100) : "0",
  );
  const [status, setStatus] = useState<"open" | "held" | "closed">(
    (initial?.status as any) ?? "open",
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");

  return (
    <Card title={initial ? "Edit slot" : "New slot"}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
        <Field label="Date">
          <input
            type="date"
            value={slotDate}
            onChange={(e) => setSlotDate(e.target.value)}
            style={inputStyle}
          />
        </Field>
        <Field label="Start">
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            style={inputStyle}
          />
        </Field>
        <Field label="End">
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            style={inputStyle}
          />
        </Field>
        <Field label="Capacity">
          <input
            type="number"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            style={inputStyle}
          />
        </Field>
        <Field label="Price $">
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            style={inputStyle}
          />
        </Field>
        <Field label="Status">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            style={inputStyle}
          >
            <option value="open">Open</option>
            <option value="held">Held</option>
            <option value="closed">Closed</option>
          </select>
        </Field>
      </div>
      <div style={{ marginTop: 14 }}>
        <Field label="Notes">
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={inputStyle}
          />
        </Field>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
        <button
          disabled={saving || !slotDate}
          onClick={() =>
            onSave({
              slotDate,
              startTime,
              endTime,
              capacity: Number(capacity) || 1,
              priceCents: Math.round(Number(price) * 100),
              status,
              notes,
            })
          }
          style={btnPrimary}
        >
          {saving ? "Saving…" : "Save slot"}
        </button>
        <button onClick={onCancel} style={btnGhost}>
          Cancel
        </button>
      </div>
    </Card>
  );
}

function Requests({ businessId, data }: { businessId: string; data: any }) {
  if (data.requests.length === 0)
    return (
      <Card>
        <div style={{ textAlign: "center", padding: "48px 20px" }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: "#e2f2ea",
              display: "grid",
              placeItems: "center",
              color: "#1f8a5b",
              margin: "0 auto 12px",
              fontSize: 22,
            }}
          >
            ✓
          </div>
          <div
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 20,
              color: "#0d2236",
            }}
          >
            Inbox clear
          </div>
          <div style={{ fontSize: 13, color: "#5c6b78", marginTop: 2 }}>
            No booking requests waiting.
          </div>
        </div>
      </Card>
    );

  return (
    <Card title="Booking requests">
      <TripList rows={data.requests} businessId={businessId} roster={data.roster} />
    </Card>
  );
}

/* --- helpers --- */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: ".08em",
          textTransform: "uppercase",
          color: "#5c6b78",
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div style={{ padding: "32px 10px", textAlign: "center", color: "#5c6b78", fontSize: 14 }}>
      {label}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  border: "1px solid rgba(13,34,54,.14)",
  borderRadius: 10,
  padding: "10px 12px",
  fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
  fontSize: 14,
  background: "#fff",
  color: "#0d2236",
  outline: "none",
};

const btnPrimary: React.CSSProperties = {
  background: "#0a2236",
  color: "#fff",
  border: 0,
  borderRadius: 11,
  padding: "10px 16px",
  fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

const btnGhost: React.CSSProperties = {
  background: "transparent",
  color: "#0d2236",
  border: "1px solid rgba(13,34,54,.14)",
  borderRadius: 11,
  padding: "10px 16px",
  fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

/* icons */
function BoxIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
      <rect x="3" y="3" width="8" height="8" rx="2" />
      <rect x="13" y="3" width="8" height="8" rx="2" />
      <rect x="3" y="13" width="8" height="8" rx="2" />
      <rect x="13" y="13" width="8" height="8" rx="2" />
    </svg>
  );
}
function CalIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
      <rect x="3" y="4" width="18" height="17" rx="2.5" />
      <path d="M3 9h18M8 2v4M16 2v4" />
    </svg>
  );
}
function TeamIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
      <circle cx="9" cy="8" r="3.4" />
      <path d="M2.5 20c.8-3.4 3.4-5.4 6.5-5.4s5.7 2 6.5 5.4" />
      <circle cx="17.5" cy="9" r="2.6" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
function InboxIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
      <path d="M4 5h16v11H8l-4 4z" />
    </svg>
  );
}
