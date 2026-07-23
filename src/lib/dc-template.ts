// Utilities for rendering the `.dc.html` templates that ship the Fish-X
// Charters landing page pixel-for-pixel. The templates are copied verbatim
// into src/dc-templates/*.html and imported as raw strings.

// The landing/auth template images ship in public/dashboards/assets/, which
// Vite copies to the site root so they serve at /dashboards/assets/<name> on
// any host. (The old /__l5e/assets-v1/… CDN paths only resolved inside
// Lovable's preview hosting and 404'd on Netlify.)
export function resolveAsset(name: string): string {
  return `/dashboards/assets/${name}`;
}

/** Extract innerHTML of <x-dc>...</x-dc> and the DC <script> body. */
export function parseDcHtml(src: string): { template: string; script: string } {
  const openIdx = src.search(/<x-dc[^>]*>/);
  const closeIdx = src.lastIndexOf("</x-dc>");
  const openTag = src.match(/<x-dc[^>]*>/);
  const template = openIdx >= 0 && closeIdx > openIdx && openTag
    ? src.slice(openIdx + openTag[0].length, closeIdx)
    : "";
  const scriptMatch = src.match(/<script[^>]*data-dc-script[^>]*>([\s\S]*?)<\/script>/);
  const script = scriptMatch ? scriptMatch[1] : "";
  return { template, script };
}

/** Clean the extracted DC template so it can be dropped into React via
 *  dangerouslySetInnerHTML: strip <helmet>/<template>, rewrite asset URLs
 *  and inter-page links, and drop DC-specific attributes browsers ignore
 *  but React would warn about. */
export function cleanTemplate(template: string): string {
  let out = template;
  out = out.replace(/<helmet[\s\S]*?<\/helmet>/g, "");
  out = out.replace(/<template[\s\S]*?<\/template>/g, "");
  // rewrite asset paths → CDN
  out = out.replace(/assets\/([a-zA-Z0-9_.-]+)/g, (_m, name) => resolveAsset(name));
  // internal cross-page links
  out = out.replace(/href="Fish-X Charters\.dc\.html"/g, 'href="/"');
  out = out.replace(/href="Fish-X Auth\.dc\.html"/g, 'href="/auth"');
  return out;
}

/** Execute the DC script against a real DOM subtree. The script defines a
 *  `class Component extends DCLogic` — we stub DCLogic minimally and drive
 *  componentDidMount ourselves. */
export function runDcScript(
  scriptText: string,
  props: Record<string, unknown>,
): () => void {
  const runner = new Function(
    "props",
    `
    class DCLogic {
      constructor() { this.props = {}; this.state = {}; }
      setState(patch) { Object.assign(this.state, patch); }
    }
    ${scriptText}
    const inst = new Component();
    inst.props = props;
    inst.state = inst.state || {};
    if (typeof inst.componentDidMount === 'function') inst.componentDidMount();
    return () => { if (typeof inst.componentWillUnmount === 'function') inst.componentWillUnmount(); };
    `,
  );
  return runner(props) as () => void;
}
