/**
 * Full-viewport iframe that hosts a static DC dashboard template
 * (served from /public/dashboards). The template ships its own React runtime
 * via support.js — we just give it a clean canvas.
 */
interface DashboardFrameProps {
  src: string;
  title: string;
}

export function DashboardFrame({ src, title }: DashboardFrameProps) {
  return (
    <iframe
      src={src}
      title={title}
      className="w-full h-screen border-0 block bg-[#eef2f5]"
      // sandbox intentionally omitted: template needs same-origin storage
      // for the DC runtime + UMD React loaded from unpkg
    />
  );
}
