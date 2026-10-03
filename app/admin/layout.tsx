import type { Metadata, Viewport } from "next";

// The desk inherited the public site's title and manifest, which made an
// installed copy of the internal pages open as the marketing site. It gets its
// own identity, its own install target and its own theme colour instead.
export const metadata: Metadata = {
  title: "Market desk | Chariot Realty",
  description: "Private Chariot Realty desk for inventory, enquiries and WhatsApp publishing.",
  manifest: "/admin/manifest.webmanifest",
  robots: { index: false, follow: false },
  appleWebApp: {
    capable: true,
    title: "Market desk",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b1f3a",
  width: "device-width",
  initialScale: 1,
};

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}