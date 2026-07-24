import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth", search: { redirect: location.href } });
    }
    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Inject a hamburger toggle into any sticky top-nav header on mobile.
  useEffect(() => {
    const HAMBURGER_SVG =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
    const CLOSE_SVG =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6l-12 12"/></svg>';

    const decorate = () => {
      const headers = document.querySelectorAll<HTMLElement>(
        '.fx-authed header[style*="sticky"]',
      );
      headers.forEach((header) => {
        const nav = header.querySelector("nav");
        if (!nav) return;
        if (header.querySelector(".fx-hamburger")) return;
        const inner = header.firstElementChild as HTMLElement | null;
        if (!inner) return;

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "fx-hamburger";
        btn.setAttribute("aria-label", "Menu");
        btn.setAttribute("aria-expanded", "false");
        btn.innerHTML = HAMBURGER_SVG;
        btn.addEventListener("click", () => {
          const open = header.getAttribute("data-nav-open") === "true";
          const next = !open;
          header.setAttribute("data-nav-open", next ? "true" : "false");
          btn.setAttribute("aria-expanded", next ? "true" : "false");
          btn.innerHTML = next ? CLOSE_SVG : HAMBURGER_SVG;
          if (next) window.scrollTo({ top: 0, behavior: "smooth" });
        });

        // Insert as the last child of the inner row so it sits at the right edge.
        inner.appendChild(btn);

        // Auto-close when a nav item is tapped.
        nav.addEventListener("click", (e) => {
          const t = e.target as HTMLElement;
          if (t.closest("a, button")) {
            header.setAttribute("data-nav-open", "false");
            btn.setAttribute("aria-expanded", "false");
            btn.innerHTML = HAMBURGER_SVG;
          }
        });
      });
    };

    decorate();
    const mo = new MutationObserver(decorate);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, []);

  // Close any open nav on route change.
  useEffect(() => {
    document
      .querySelectorAll<HTMLElement>('.fx-authed header[data-nav-open="true"]')
      .forEach((h) => {
        h.setAttribute("data-nav-open", "false");
        const btn = h.querySelector<HTMLButtonElement>(".fx-hamburger");
        if (btn) {
          btn.setAttribute("aria-expanded", "false");
          btn.innerHTML =
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
        }
      });
  }, [pathname]);

  return (
    <div className="fx-authed">
      <Outlet />
    </div>
  );
}
