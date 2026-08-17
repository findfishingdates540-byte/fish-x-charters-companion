/**
 * Image picker for operator forms — upload a file instead of pasting a URL.
 *
 * Files go to the private `business-media` bucket under
 * `<businessId>/public/<name>` and are served back through the public media
 * proxy route, so anglers can see them on listings without the bucket itself
 * being public. Pasting a URL still works for operators using their own CDN.
 */
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const MAX_BYTES = 8 * 1024 * 1024;

export function ImageUpload({
  businessId,
  value,
  onChange,
  label = "Image",
  aspect = "16 / 9",
  disabled,
}: {
  businessId: string;
  value: string;
  onChange: (url: string) => void;
  label?: string;
  aspect?: string;
  disabled?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function upload(file: File) {
    setErr(null);
    if (!file.type.startsWith("image/")) return setErr("Please choose an image file.");
    if (file.size > MAX_BYTES) return setErr("Image must be 8 MB or smaller.");

    setBusy(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
      const name = `${crypto.randomUUID()}.${ext || "jpg"}`;
      const path = `${businessId}/public/${name}`;
      const { error } = await supabase.storage
        .from("business-media")
        .upload(path, file, { cacheControl: "31536000", upsert: false, contentType: file.type });
      if (error) throw new Error(error.message);
      onChange(`/api/public/media/${path}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed. Please try again.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <span
        style={{
          fontSize: 11,
          letterSpacing: ".1em",
          textTransform: "uppercase",
          color: "#7b8b99",
          fontWeight: 700,
        }}
      >
        {label}
      </span>

      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div
          style={{
            width: 168,
            aspectRatio: aspect,
            borderRadius: 12,
            border: "1px dashed rgba(13,34,54,.22)",
            background: value ? `center/cover no-repeat url(${value})` : "#eef2f5",
            display: "grid",
            placeItems: "center",
            color: "#8a97a3",
            fontSize: 12,
            flex: "none",
            overflow: "hidden",
          }}
        >
          {!value && (busy ? "Uploading…" : "No image")}
        </div>

        <div style={{ display: "grid", gap: 8, minWidth: 220, flex: 1 }}>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
            }}
          />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              disabled={disabled || busy}
              onClick={() => fileRef.current?.click()}
              style={{
                background: "#0d2236",
                color: "#fff",
                border: 0,
                borderRadius: 10,
                padding: "9px 16px",
                fontSize: 13,
                fontWeight: 700,
                cursor: disabled || busy ? "default" : "pointer",
                opacity: disabled || busy ? 0.65 : 1,
              }}
            >
              {busy ? "Uploading…" : value ? "Replace image" : "Upload image"}
            </button>
            {value && !disabled && (
              <button
                type="button"
                onClick={() => onChange("")}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(13,34,54,.16)",
                  borderRadius: 10,
                  padding: "9px 14px",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#44586a",
                  cursor: "pointer",
                }}
              >
                Remove
              </button>
            )}
          </div>

          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder="…or paste an image URL"
            style={{
              width: "100%",
              padding: "9px 12px",
              borderRadius: 10,
              border: "1px solid rgba(13,34,54,.14)",
              fontSize: 12.5,
              color: "#44586a",
              background: "#fff",
            }}
          />
          <span style={{ fontSize: 11.5, color: "#8a97a3" }}>
            JPG, PNG or WebP up to 8 MB. Landscape photos look best.
          </span>
          {err && <span style={{ fontSize: 12, color: "#d8514a" }}>{err}</span>}
        </div>
      </div>
    </div>
  );
}
