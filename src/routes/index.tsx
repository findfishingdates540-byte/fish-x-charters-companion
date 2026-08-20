import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef } from "react";
import landingRaw from "@/dc-templates/landing.html?raw";
import { cleanTemplate, parseDcHtml, runDcScript } from "@/lib/dc-template";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FISH-X.COM Bookings & Marketplace — One platform for the entire fishing industry" },
      {
        name: "description",
        content:
          "Book fishing charters and buy from tackle shops, marinas, guides and gear brands in one escrow-secured marketplace for the whole fishing industry.",
      },
      { property: "og:title", content: "FISH-X.COM Bookings & Marketplace" },
      {
        property: "og:description",
        content: "One platform for the entire fishing industry — charters, tackle, marinas and wholesale.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const hostRef = useRef<HTMLDivElement>(null);
  const { template, script } = useMemo(() => {
    const parsed = parseDcHtml(landingRaw);
    return { template: cleanTemplate(parsed.template), script: parsed.script };
  }, []);

  useEffect(() => {
    if (!hostRef.current) return;
    document.body.classList.add("dc-body");
    const dispose = runDcScript(script, {
      palette: "Sand Gold",
      animate: true,
      showMarquee: true,
    });
    return () => {
      dispose();
      document.body.classList.remove("dc-body");
    };
  }, [script]);

  return (
    <div
      ref={hostRef}
      className="dc-landing"
      dangerouslySetInnerHTML={{ __html: template }}
    />
  );
}
