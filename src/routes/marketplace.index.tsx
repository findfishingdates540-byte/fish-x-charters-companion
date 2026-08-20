import { createFileRoute } from "@tanstack/react-router";
import { Marketplace } from "@/components/marketplace/Marketplace";

export const Route = createFileRoute("/marketplace/")({
  head: () => ({
    meta: [
      { title: "Marketplace — FISH-X.COM Bookings & Marketplace" },
      {
        name: "description",
        content:
          "Gear, tackle, and apparel from verified Fish-X sellers — escrow-protected, released only when delivery is confirmed.",
      },
      { property: "og:title", content: "Marketplace — FISH-X.COM Bookings & Marketplace" },
      {
        property: "og:description",
        content: "Shop rods, reels, tackle, and apparel from verified Fish-X operators.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Marketplace,
});
