// Utilities for rendering the `.dc.html` templates that ship the Fish-X
// Charters landing page pixel-for-pixel. The templates are copied verbatim
// into src/dc-templates/*.html and imported as raw strings.

const ASSET_URLS: Record<string, string> = {
  "cap-alessandro.png": "/__l5e/assets-v1/ef87ef4c-b7d9-4792-a62b-f2869d530620/cap-alessandro.png",
  "helm.png": "/__l5e/assets-v1/0f3aeb4d-bbf0-4932-9ce4-d15b37e1fb84/helm.png",
  "james.jpg": "/__l5e/assets-v1/ea01ac20-ddf1-49eb-b4e6-c2cced9631a5/james.jpg",
  "rev-julianne.png": "/__l5e/assets-v1/d4df6363-395e-4956-b636-53564b8dbcda/rev-julianne.png",
  "rev-marcus.png": "/__l5e/assets-v1/bd018ef1-ecdb-4b59-a6ed-a54a05e08253/rev-marcus.png",
  "robert.jpg": "/__l5e/assets-v1/bc3205aa-dad8-4ab0-a663-449670bfc0a5/robert.jpg",
  "seascape.jpg": "/__l5e/assets-v1/a5cffe8e-82de-438a-8391-1c422fed4dc9/seascape.jpg",
  "seraphina.jpg": "/__l5e/assets-v1/ed3af574-ce0c-4f18-a4e8-f5803562a920/seraphina.jpg",
  "yacht-coast.png": "/__l5e/assets-v1/d83686fe-7da2-4768-ab4e-5bb324aa18c6/yacht-coast.png",
};

export function resolveAsset(name: string): string {
  return ASSET_URLS[name] ?? `/assets/${name}`;
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
