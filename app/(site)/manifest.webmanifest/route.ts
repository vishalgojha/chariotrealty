import type { MetadataRoute } from "next";

// The marketing manifest, served as a route handler rather than the
// app/manifest.ts metadata file.
//
// Next only builds a web app manifest from app/manifest.ts at the root, and a
// page can link just one. The root form therefore applied to the desk too, so
// installing from the internal pages added the marketing site, whose start URL
// is the public home page. Each scope now serves its own manifest: this one for
// the site, and /admin/manifest.webmanifest for the desk.
export const dynamic = "force-static";

const MANIFEST: MetadataRoute.Manifest = {
  name: "Chariot Realty — Mumbai Property",
  short_name: "Chariot Realty",
  id: "/",
  description: "Verified homes, rentals and commercial opportunities across Bandra, BKC and Mumbai's Western Suburbs.",
  start_url: "/",
  scope: "/",
  display: "standalone",
  display_override: ["window-controls-overlay", "standalone"],
  background_color: "#faf7f0",
  theme_color: "#0a1f44",
  orientation: "any",
  lang: "en-IN",
  categories: ["business", "lifestyle", "shopping"],
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