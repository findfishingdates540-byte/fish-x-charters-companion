import { useMemo, useState } from "react";
import {
  useSuspenseQuery,
  useMutation,
  useQueryClient,
  queryOptions,
} from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getMarinaOverview,
  upsertSlip,
  deleteSlip,
  upsertReservation,
} from "@/lib/marina.functions";
import {
  OperatorShell,
  OperatorNavItem,
  KPICard,
  Card,
  StatusPill,
  money,
} from "@/components/operator/OperatorShell";

type Slip = {
  id: string;
  slip_number: string;
  status: string;
  monthly_rate_cents: number | null;
  nightly_rate_cents: number | null;
};

type Reservation = {
  id: string;
  vessel_name: string;
  captain_name: string | null;
  arrive_date: string;
  depart_date: string;
  total_cents: number | null;
  status: string;
  slip: { slip_number: string } | null;
};

const overviewQO = (businessId: string) =>
  queryOptions({
    queryKey: ["marina-overview", businessId],
    queryFn: () => getMarinaOverview({ data: { businessId } }),
  });

const NAV: OperatorNavItem[] = [
  { key: "overview", label: "Overview", icon: <BoxIcon /> },
  { key: "slips", label: "Slips", icon: <BoatIcon /> },
  { key: "reservations", label: "Reservations", icon: <CalIcon /> },
  { key: "services", label: "Services", icon: <WrenchIcon /> },
];

export function MarinaDashboard({
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
  const pending = data.reservations.filter((r: Reservation) => r.status === "pending").length;

  const nav = NAV.map((n) =>
    n.key === "reservations" && pending > 0 ? { ...n, badge: pending } : n,
  );

  const titles: Record<string, { t: string; s: string }> = {
    overview: { t: "Harbor overview", s: "Occupancy, reservations, dock health." },
    slips: { t: "Slip inventory", s: "Manage berths, rates, and status." },
    reservations: { t: "Reservations", s: "Vessels arriving and staying." },
    services: { t: "Marina services", s: "Amenities and operating settings." },
  };

  return (
    <OperatorShell
      workspaceName={workspaceName}
      workspaceKind="Marina"
      operatorName={operatorName}
      operatorRole="Harbormaster"
      nav={nav}
      active={active}
      onNav={setActive}
      pageTitle={titles[active].t}
      pageSub={titles[active].s}
      headerRight={
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            background: "#fff",
            border: "1px solid rgba(13,34,54,.10)",
            borderRadius: 30,
            padding: "9px 16px",
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#1f8a5b",
            }}
          />
          <span style={{ fontSize: 12.5, fontWeight: 600, color: "#0d2236" }}>
            VHF Ch. 16 monitored
          </span>
        </div>
      }
    >
      {active === "overview" && <Overview businessId={businessId} data={data} />}
      {active === "slips" && <Slips businessId={businessId} data={data} />}
      {active === "reservations" && (
        <Reservations businessId={businessId} data={data} />
      )}
      {active === "services" && <Services />}
    </OperatorShell>
  );
}

function Overview({ businessId: _b, data }: { businessId: string; data: any }) {
  const c = data.counts;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 18,
        }}
      >
        <KPICard
          label="Occupancy"
          value={`${c.total ? Math.round(((c.occupied + c.reserved) / c.total) * 100) : 0}%`}
          trend={`${c.occupied + c.reserved}/${c.total}`}
        />
        <KPICard label="Available" value={String(c.available)} trend="ready" />
        <KPICard
          label="Maintenance"
          value={String(c.maintenance)}
          trend={c.maintenance ? "action" : "clear"}
          trendPositive={c.maintenance === 0}
        />
        <KPICard label="Month gross" value={money(data.monthGrossCents)} trend="MTD" />
      </div>

      <Card eyebrow="Reservations" title="Latest arrivals">
        <ReservationTable rows={data.reservations.slice(0, 8)} />
      </Card>
    </div>
  );
}

function Slips({ businessId, data }: { businessId: string; data: any }) {
  const qc = useQueryClient();
  const upsertFn = useServerFn(upsertSlip);
  const deleteFn = useServerFn(deleteSlip);
  const [editing, setEditing] = useState<Slip | null>(null);
  const [showForm, setShowForm] = useState(false);

  const upsertM = useMutation({
    mutationFn: upsertFn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marina-overview", businessId] });
      setEditing(null);
      setShowForm(false);
    },
  });
  const deleteM = useMutation({
    mutationFn: deleteFn,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["marina-overview", businessId] }),
  });

  const colors: Record<string, { bg: string; fg: string; border: string }> = {
    available: { bg: "#fff", fg: "#0d2236", border: "rgba(13,34,54,.10)" },
    occupied: { bg: "#0a2236", fg: "#fff", border: "#0a2236" },
    reserved: { bg: "#1f9fbe", fg: "#fff", border: "#1f9fbe" },
    maintenance: { bg: "#d8514a", fg: "#fff", border: "#d8514a" },
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Card
        title="Slip map"
        eyebrow="Berths"
        right={
          <button
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            style={btnPrimary}
          >
            + Add slip
          </button>
        }
      >
        {data.slips.length === 0 ? (
          <Empty label="No slips yet — add your first berth." />
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(10, minmax(0,1fr))",
              gap: 8,
            }}
          >
            {data.slips.map((s: Slip) => {
              const c = colors[s.status] ?? colors.available;
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    setEditing(s);
                    setShowForm(true);
                  }}
                  title={`Slip ${s.slip_number} · ${s.status}`}
                  style={{
                    aspectRatio: "1 / 1",
                    borderRadius: 10,
                    border: `1px solid ${c.border}`,
                    background: c.bg,
                    color: c.fg,
                    fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  {s.slip_number}
                </button>
              );
            })}
          </div>
        )}
        <div style={{ marginTop: 18, display: "flex", gap: 18, fontSize: 12, color: "#5c6b78" }}>
          <Legend swatch="#0a2236" label={`Occupied ${data.counts.occupied}`} />
          <Legend swatch="#1f9fbe" label={`Reserved ${data.counts.reserved}`} />
          <Legend swatch="#fff" bordered label={`Available ${data.counts.available}`} />
          <Legend swatch="#d8514a" label={`Maintenance ${data.counts.maintenance}`} />
        </div>
      </Card>

      {showForm && (
        <SlipForm
          initial={editing ?? undefined}
          onCancel={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSave={(v) =>
            upsertM.mutate({
              data: { ...v, businessId, id: editing?.id },
            })
          }
          onDelete={
            editing
              ? () =>
                  deleteM.mutate({ data: { id: editing.id, businessId } })
              : undefined
          }
          saving={upsertM.isPending}
        />
      )}
    </div>
  );
}

function SlipForm({
  initial,
  onCancel,
  onSave,
  onDelete,
  saving,
}: {
  initial?: Slip;
  onCancel: () => void;
  onSave: (v: {
    slipNumber: string;
    lengthFt: number | null;
    beamFt: number | null;
    amperage: string;
    monthlyRateCents: number | null;
    nightlyRateCents: number | null;
    status: "available" | "occupied" | "reserved" | "maintenance";
  }) => void;
  onDelete?: () => void;
  saving: boolean;
}) {
  const [slipNumber, setSlipNumber] = useState(initial?.slip_number ?? "");
  const [status, setStatus] = useState<
    "available" | "occupied" | "reserved" | "maintenance"
  >((initial?.status as any) ?? "available");
  const [lengthFt, setLengthFt] = useState("");
  const [beamFt, setBeamFt] = useState("");
  const [amperage, setAmperage] = useState("");
  const [monthly, setMonthly] = useState(
    initial?.monthly_rate_cents ? String(initial.monthly_rate_cents / 100) : "",
  );
  const [nightly, setNightly] = useState(
    initial?.nightly_rate_cents ? String(initial.nightly_rate_cents / 100) : "",
  );

  return (
    <Card title={initial ? `Edit slip ${initial.slip_number}` : "Add slip"}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 14,
        }}
      >
        <Field label="Slip #">
          <input value={slipNumber} onChange={(e) => setSlipNumber(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Status">
          <select value={status} onChange={(e) => setStatus(e.target.value as any)} style={inputStyle}>
            <option value="available">Available</option>
            <option value="occupied">Occupied</option>
            <option value="reserved">Reserved</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </Field>
        <Field label="Amperage">
          <input value={amperage} onChange={(e) => setAmperage(e.target.value)} placeholder="30/50 A" style={inputStyle} />
        </Field>
        <Field label="Length (ft)">
          <input type="number" value={lengthFt} onChange={(e) => setLengthFt(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Beam (ft)">
          <input type="number" value={beamFt} onChange={(e) => setBeamFt(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Monthly $">
          <input type="number" value={monthly} onChange={(e) => setMonthly(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Nightly $">
          <input type="number" value={nightly} onChange={(e) => setNightly(e.target.value)} style={inputStyle} />
        </Field>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 20, alignItems: "center" }}>
        <button
          disabled={saving || !slipNumber}
          onClick={() =>
            onSave({
              slipNumber,
              status,
              lengthFt: lengthFt ? Number(lengthFt) : null,
              beamFt: beamFt ? Number(beamFt) : null,
              amperage,
              monthlyRateCents: monthly ? Math.round(Number(monthly) * 100) : null,
              nightlyRateCents: nightly ? Math.round(Number(nightly) * 100) : null,
            })
          }
          style={btnPrimary}
        >
          {saving ? "Saving…" : "Save slip"}
        </button>
        <button onClick={onCancel} style={btnGhost}>
          Cancel
        </button>
        {onDelete && (
          <button
            onClick={onDelete}
            style={{
              ...btnGhost,
              marginLeft: "auto",
              color: "#d8514a",
              borderColor: "#fbe9e8",
            }}
          >
            Delete
          </button>
        )}
      </div>
    </Card>
  );
}

function Reservations({
  businessId,
  data,
}: {
  businessId: string;
  data: any;
}) {
  const qc = useQueryClient();
  const upsertFn = useServerFn(upsertReservation);
  const [showForm, setShowForm] = useState(false);

  const upsertM = useMutation({
    mutationFn: upsertFn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marina-overview", businessId] });
      setShowForm(false);
    },
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Card
        title="All reservations"
        right={
          <button onClick={() => setShowForm((v) => !v)} style={btnPrimary}>
            {showForm ? "Close" : "+ New reservation"}
          </button>
        }
      >
        <ReservationTable rows={data.reservations} />
      </Card>
      {showForm && (
        <ReservationForm
          slips={data.slips}
          saving={upsertM.isPending}
          onSave={(v) => upsertM.mutate({ data: { ...v, businessId } })}
        />
      )}
    </div>
  );
}

function ReservationForm({
  slips,
  onSave,
  saving,
}: {
  slips: Slip[];
  onSave: (v: {
    vesselName: string;
    captainName: string;
    arriveDate: string;
    departDate: string;
    totalCents: number;
    slipId: string | null;
    status: "pending" | "confirmed" | "checked_in" | "checked_out" | "cancelled";
  }) => void;
  saving: boolean;
}) {
  const [vessel, setVessel] = useState("");
  const [captain, setCaptain] = useState("");
  const [arrive, setArrive] = useState("");
  const [depart, setDepart] = useState("");
  const [total, setTotal] = useState("");
  const [slipId, setSlipId] = useState<string>("");
  const [status, setStatus] = useState<
    "pending" | "confirmed" | "checked_in" | "checked_out" | "cancelled"
  >("pending");

  return (
    <Card title="New reservation">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
        <Field label="Vessel name">
          <input value={vessel} onChange={(e) => setVessel(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Captain / owner">
          <input value={captain} onChange={(e) => setCaptain(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Slip">
          <select value={slipId} onChange={(e) => setSlipId(e.target.value)} style={inputStyle}>
            <option value="">Unassigned</option>
            {slips.map((s) => (
              <option key={s.id} value={s.id}>
                {s.slip_number}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Arrive">
          <input type="date" value={arrive} onChange={(e) => setArrive(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Depart">
          <input type="date" value={depart} onChange={(e) => setDepart(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Total $">
          <input type="number" value={total} onChange={(e) => setTotal(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Status">
          <select value={status} onChange={(e) => setStatus(e.target.value as any)} style={inputStyle}>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="checked_in">Checked in</option>
            <option value="checked_out">Checked out</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </Field>
      </div>
      <div style={{ marginTop: 18 }}>
        <button
          disabled={saving || !vessel || !arrive || !depart}
          onClick={() =>
            onSave({
              vesselName: vessel,
              captainName: captain,
              arriveDate: arrive,
              departDate: depart,
              totalCents: total ? Math.round(Number(total) * 100) : 0,
              slipId: slipId || null,
              status,
            })
          }
          style={btnPrimary}
        >
          {saving ? "Saving…" : "Save reservation"}
        </button>
      </div>
    </Card>
  );
}

function ReservationTable({ rows }: { rows: Reservation[] }) {
  if (!rows.length) return <Empty label="No reservations yet." />;
  const toneFor = (s: string) =>
    s === "confirmed"
      ? "green"
      : s === "pending"
        ? "gold"
        : s === "checked_in"
          ? "cyan"
          : s === "cancelled"
            ? "red"
            : "muted";
  return (
    <div style={{ overflowX: "auto" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.5fr 1fr .8fr .8fr auto",
          gap: 16,
          padding: "10px 4px 12px",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: ".1em",
          textTransform: "uppercase",
          color: "#5c6b78",
          borderBottom: "1px solid rgba(13,34,54,.10)",
        }}
      >
        <span>Vessel &amp; captain</span>
        <span>Stay</span>
        <span>Slip</span>
        <span>Amount</span>
        <span>Status</span>
      </div>
      {rows.map((r) => (
        <div
          key={r.id}
          style={{
            display: "grid",
            gridTemplateColumns: "1.5fr 1fr .8fr .8fr auto",
            gap: 16,
            padding: "14px 4px",
            borderBottom: "1px solid rgba(13,34,54,.06)",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#0d2236" }}>
              {r.vessel_name}
            </div>
            <div style={{ fontSize: 12.5, color: "#5c6b78" }}>
              {r.captain_name ?? "—"}
            </div>
          </div>
          <span style={{ fontSize: 13.5, color: "#0d2236" }}>
            {new Date(r.arrive_date).toLocaleDateString()} →{" "}
            {new Date(r.depart_date).toLocaleDateString()}
          </span>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: "#0d2236" }}>
            {r.slip?.slip_number ?? "—"}
          </span>
          <span
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 17,
              fontWeight: 600,
              color: "#0d2236",
            }}
          >
            {money(r.total_cents)}
          </span>
          <StatusPill label={r.status.replace("_", " ")} tone={toneFor(r.status) as any} />
        </div>
      ))}
    </div>
  );
}

function Services() {
  return (
    <Card
      eyebrow="Coming soon"
      title="Amenities & service requests"
    >
      <p style={{ color: "#5c6b78", fontSize: 14, lineHeight: 1.6, margin: 0 }}>
        Amenity toggles (fuel, ice, pump-out, laundry) and inbound service requests
        will publish here. For now use the Slips tab to manage berth status.
      </p>
    </Card>
  );
}

/* --- tiny UI helpers --- */

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

function Empty({ label }: { label: string }) {
  return (
    <div style={{ padding: "32px 10px", textAlign: "center", color: "#5c6b78", fontSize: 14 }}>
      {label}
    </div>
  );
}

function Legend({
  swatch,
  label,
  bordered,
}: {
  swatch: string;
  label: string;
  bordered?: boolean;
}) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: 3,
          background: swatch,
          border: bordered ? "1px solid rgba(13,34,54,.14)" : "none",
        }}
      />
      {label}
    </span>
  );
}

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
function BoatIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
      <path d="M4 20V8l8-4 8 4v12M9 20v-6h6v6" />
    </svg>
  );
}
function CalIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
      <rect x="3" y="4" width="18" height="17" rx="2.5" />
      <path d="M3 9h18M8 2v4M16 2v4" />
      <path d="m9 15 2 2 4-4" />
    </svg>
  );
}
function WrenchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-2.4z" />
    </svg>
  );
}

// keep useMemo import used to avoid unused warning if we add filters later
void useMemo;
