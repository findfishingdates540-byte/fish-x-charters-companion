import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef } from "react";
import landingRaw from "@/dc-templates/landing.html?raw";
import { cleanTemplate, parseDcHtml, runDcScript } from "@/lib/dc-template";

export const Route = createFileRoute("/")({
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
