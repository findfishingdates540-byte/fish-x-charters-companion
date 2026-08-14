// Real Fish-X marina photography (CDN assets) used as platform imagery and
// fallbacks wherever an operator hasn't uploaded their own hero shot.
import marinaSunset from "@/assets/platform/marina-sunset.jpg.asset.json";
import harbourFleet from "@/assets/platform/harbour-fleet.jpg.asset.json";
import marinaWide from "@/assets/platform/marina-wide.jpg.asset.json";
import morningMarina from "@/assets/platform/morning-marina.jpg.asset.json";
import blueHarbour from "@/assets/platform/blue-harbour.jpg.asset.json";
import eveningBerth from "@/assets/platform/evening-berth.jpg.asset.json";
import quietBasin from "@/assets/platform/quiet-basin.jpg.asset.json";

export const PLATFORM_PHOTOS = {
  marinaSunset: marinaSunset.url,
  harbourFleet: harbourFleet.url,
  marinaWide: marinaWide.url,
  morningMarina: morningMarina.url,
  blueHarbour: blueHarbour.url,
  eveningBerth: eveningBerth.url,
  quietBasin: quietBasin.url,
} as const;

export const PLATFORM_GALLERY: string[] = [
  PLATFORM_PHOTOS.marinaSunset,
  PLATFORM_PHOTOS.harbourFleet,
  PLATFORM_PHOTOS.marinaWide,
  PLATFORM_PHOTOS.morningMarina,
  PLATFORM_PHOTOS.blueHarbour,
  PLATFORM_PHOTOS.eveningBerth,
  PLATFORM_PHOTOS.quietBasin,
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
