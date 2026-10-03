import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
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
}
