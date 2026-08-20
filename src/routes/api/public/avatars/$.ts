/**
 * Public image proxy for user avatars.
 *
 * Uploads land in the private `avatars` bucket under `<userId>/public/<file>`.
 * Only that `public/` prefix is served here, so anything else stays private.
 */
import { createFileRoute } from "@tanstack/react-router";

const PATH_RE = /^[0-9a-f-]{36}\/public\/[A-Za-z0-9._-]{1,120}$/i;

export const Route = createFileRoute("/api/public/avatars/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const path = (params as { _splat?: string })._splat ?? "";
        if (!PATH_RE.test(path)) return new Response("Not found", { status: 404 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage.from("avatars").download(path);
        if (error || !data) return new Response("Not found", { status: 404 });

        const type = data.type || "application/octet-stream";
        if (!type.startsWith("image/")) return new Response("Not found", { status: 404 });

        return new Response(await data.arrayBuffer(), {
          headers: {
            "Content-Type": type,
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      },
    },
  },
});
