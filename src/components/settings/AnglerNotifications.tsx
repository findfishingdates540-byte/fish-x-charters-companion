/**
 * Angler-side notification preferences (light theme twin of the operator card).
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from "@/lib/notifications.functions";

const CATEGORIES: Array<{ key: string; label: string; hint: string }> = [
  { key: "booking", label: "Bookings", hint: "Confirmations, declines and cancellations." },
  { key: "reminder", label: "Trip reminders", hint: "Nudges 48 and 24 hours before departure." },
  { key: "payment", label: "Payments & refunds", hint: "Deposits, balances and refunds." },
  { key: "message", label: "Messages", hint: "Replies from captains, shops and marinas." },
  { key: "review", label: "Reviews", hint: "Reminders to review a completed trip." },
  { key: "system", label: "Account", hint: "Security and account updates." },
];

const line = "rgba(13,34,54,.10)";

export function AnglerNotifications() {
  const qc = useQueryClient();
  const fetchPrefs = useServerFn(getNotificationPreferences);
  const savePrefs = useServerFn(updateNotificationPreferences);

  const { data } = useQuery({ queryKey: ["notification-prefs"], queryFn: () => fetchPrefs() });
  const m = useMutation({
    mutationFn: (v: { emailEnabled?: boolean; categories?: Record<string, boolean> }) =>
      savePrefs({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notification-prefs"] }),
  });

  if (!data) return <div style={{ color: "#5c6b78", fontSize: 14 }}>Loading preferences…</div>;
  const cats = data.categories ?? {};

  return (
    <div style={{ background: "#fff", border: `1px solid ${line}`, borderRadius: 18, padding: 20, display: "grid", gap: 14 }}>
      <Row
        label="Email notifications"
        hint="Turn off to receive in-app alerts only."
        checked={data.emailEnabled}
        onChange={(v) => m.mutate({ emailEnabled: v })}
      />
      <div style={{ height: 1, background: line }} />
      {CATEGORIES.map((c) => (
        <Row
          key={c.key}
          label={c.label}
          hint={c.hint}
          checked={cats[c.key] !== false}
          onChange={(v) => m.mutate({ categories: { ...cats, [c.key]: v } })}
        />
      ))}
    </div>
  );
}

function Row({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ width: 18, height: 18, accentColor: "#072057" }}
      />
      <span style={{ flex: 1 }}>
        <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: "#031029" }}>{label}</span>
        <span style={{ display: "block", fontSize: 12.5, color: "#5c6b78" }}>{hint}</span>
      </span>
    </label>
  );
}
