/**
 * Shared FISH-X.COM wordmark: cyan diamond + "FISH-X.COM" serif + small-caps
 * "Bookings & Marketplace" subline. Single source of truth so the public
 * header and every dashboard render the identical logo.
 *
 * tone="dark"  -> light text, for navy headers/sidebars (dashboards)
 * tone="light" -> navy text, for light backgrounds (public header)
 */
export function BrandLogo({
  tone = "dark",
  size = 20,
}: {
  tone?: "dark" | "light";
  size?: number;
}) {
  const ink = tone === "dark" ? "#F0F2F5" : "#031029";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 11 }}>
      <span
        style={{
          width: 11,
          height: 11,
          background: "#2DE2F2",
          transform: "rotate(45deg)",
          display: "inline-block",
          borderRadius: 1,
          flexShrink: 0,
        }}
      />
      <span style={{ display: "grid", lineHeight: 1.05, color: ink }}>
        <span
          style={{
            fontFamily: "var(--serif, Georgia, serif)",
            fontWeight: 600,
            fontSize: size,
            letterSpacing: ".02em",
            whiteSpace: "nowrap",
          }}
        >
          FISH-X.COM
        </span>
        <span
          style={{
            fontFamily: "var(--sans, 'Outfit', system-ui, sans-serif)",
            fontSize: Math.max(9, Math.round(size * 0.48)),
            fontWeight: 700,
            letterSpacing: ".22em",
            textTransform: "uppercase",
            color: "#2DE2F2",
            marginTop: 3,
            whiteSpace: "nowrap",
          }}
        >
          Bookings &amp; Marketplace
        </span>
      </span>
    </span>
  );
}
