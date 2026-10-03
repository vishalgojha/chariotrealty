import type { MetadataRoute } from "next";

// The internal pages are installable too, but as the desk rather than as the
// public site: installing from app.chariotrealty.in used to add a "Chariot
// Realty" property site whose start URL was the marketing home page.
//
// Next only builds a web app manifest from app/manifest.ts, so the desk has its
// own route handler to be addressable at /admin/manifest.webmanifest.
export const dynamic = "force-static";

const MANIFEST: MetadataRoute.Manifest = {
  name: "Chariot Market Desk",
  short_name: "Market desk",
  id: "/admin",
  description: "Private Chariot Realty desk for inventory, enquiries and WhatsApp publishing.",
  start_url: "/admin",
  scope: "/admin",
  display: "standalone",
  display_override: ["window-controls-overlay", "standalone"],
  background_color: "#0b1f3a",
  theme_color: "#0b1f3a",
  orientation: "any",
  lang: "en-IN",
  categories: ["business", "productivity"],
  icons: [
    { src: "/app-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/app-icon-any.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "/app-icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
};

export function GET() {
  return new Response(JSON.stringify(MANIFEST), {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}