import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Chariot Realty Mumbai",
    short_name: "Chariot Realty",
    id: "/admin",
    description: "Bandra, BKC and Western Suburbs property operations dashboard.",
    start_url: "/admin",
    display: "standalone",
    background_color: "#fbf9f5",
    theme_color: "#0b1f3a",
    orientation: "portrait-primary",
    icons: [
      { src: "/images.jpeg", sizes: "192x192", type: "image/jpeg", purpose: "any" },
      { src: "/images.jpeg", sizes: "512x512", type: "image/jpeg", purpose: "maskable" },
    ],
  };
}
