// Real Fish-X marina photography (CDN assets) used as platform imagery and
// fallbacks wherever an operator hasn't uploaded their own hero shot.
import marinaSunset from "@/assets/platform/marina-sunset.jpg.asset.json";
import harbourFleet from "@/assets/platform/harbour-fleet.jpg.asset.json";
import marinaWide from "@/assets/platform/marina-wide.jpg.asset.json";
import morningMarina from "@/assets/platform/morning-marina.jpg.asset.json";
import blueHarbour from "@/assets/platform/blue-harbour.jpg.asset.json";
import eveningBerth from "@/assets/platform/evening-berth.jpg.asset.json";
import quietBasin from "@/assets/platform/quiet-basin.jpg.asset.json";
import m03 from "@/assets/platform/marina-03.jpg.asset.json";
import m04 from "@/assets/platform/marina-04.jpg.asset.json";
import m05 from "@/assets/platform/marina-05.jpg.asset.json";
import m06 from "@/assets/platform/marina-06.jpg.asset.json";
import m07 from "@/assets/platform/marina-07.jpg.asset.json";
import m08 from "@/assets/platform/marina-08.jpg.asset.json";
import m09 from "@/assets/platform/marina-09.jpg.asset.json";
import m11 from "@/assets/platform/marina-11.jpg.asset.json";
import m12 from "@/assets/platform/marina-12.jpg.asset.json";
import m13 from "@/assets/platform/marina-13.jpg.asset.json";
import m15 from "@/assets/platform/marina-15.jpg.asset.json";
import m16 from "@/assets/platform/marina-16.jpg.asset.json";
import m19 from "@/assets/platform/marina-19.jpg.asset.json";

/**
 * Asset pointers are served from Lovable's CDN at a root-relative path, which
 * only resolves on Lovable hosting. On other hosts (e.g. Netlify) that path
 * 404s and every photo breaks, so make the URLs absolute.
 */
const ASSET_CDN_ORIGIN = "https://fishx-charter-hub.lovable.app";
const abs = (u: string) => (u.startsWith("/__l5e/") ? ASSET_CDN_ORIGIN + u : u);

export const PLATFORM_PHOTOS = {
  marinaSunset: abs(marinaSunset.url),
  harbourFleet: abs(harbourFleet.url),
  marinaWide: abs(marinaWide.url),
  morningMarina: abs(morningMarina.url),
  blueHarbour: abs(blueHarbour.url),
  eveningBerth: abs(eveningBerth.url),
  quietBasin: abs(quietBasin.url),
  dockLines: abs(m03.url),
  boatyard: abs(m04.url),
  openWater: abs(m05.url),
  slipway: abs(m06.url),
  transom: abs(m07.url),
  moorings: abs(m08.url),
  goldenDock: abs(m09.url),
  pontoon: abs(m11.url),
  hullside: abs(m12.url),
  breakwater: abs(m13.url),
  tideOut: abs(m15.url),
  duskFleet: abs(m16.url),
  channel: abs(m19.url),
} as const;

/** Every real photo, in a pleasing display order. */
export const PLATFORM_GALLERY: string[] = [
  PLATFORM_PHOTOS.marinaSunset,
  PLATFORM_PHOTOS.harbourFleet,
  PLATFORM_PHOTOS.marinaWide,
  PLATFORM_PHOTOS.morningMarina,
  PLATFORM_PHOTOS.blueHarbour,
  PLATFORM_PHOTOS.eveningBerth,
  PLATFORM_PHOTOS.quietBasin,
  PLATFORM_PHOTOS.dockLines,
  PLATFORM_PHOTOS.boatyard,
  PLATFORM_PHOTOS.openWater,
  PLATFORM_PHOTOS.slipway,
  PLATFORM_PHOTOS.transom,
  PLATFORM_PHOTOS.moorings,
  PLATFORM_PHOTOS.goldenDock,
  PLATFORM_PHOTOS.pontoon,
  PLATFORM_PHOTOS.hullside,
  PLATFORM_PHOTOS.breakwater,
  PLATFORM_PHOTOS.tideOut,
  PLATFORM_PHOTOS.duskFleet,
  PLATFORM_PHOTOS.channel,
];

/** Default hero used when a listing/business has no image of its own. */
export const DEFAULT_HERO = PLATFORM_PHOTOS.marinaSunset;

/** Stable per-id photo so cards don't all show the same image. */
export function photoFor(id?: string | null): string {
  if (!id) return DEFAULT_HERO;
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PLATFORM_GALLERY[h % PLATFORM_GALLERY.length];
}

/** N distinct photos for a gallery strip, stable per id. */
export function galleryFor(id?: string | null, count = 5): string[] {
  let h = 0;
  const key = id ?? "fishx";
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  const start = h % PLATFORM_GALLERY.length;
  return Array.from(
    { length: Math.min(count, PLATFORM_GALLERY.length) },
    (_, i) => PLATFORM_GALLERY[(start + i) % PLATFORM_GALLERY.length],
  );
}
