import type { Metadata, Viewport } from "next";
import "./globals.css";
import PwaRegister from "./pwa-register";

const SITE_URL = "https://www.chariotrealty.in";

export const metadata: Metadata = {
  applicationName: "Chariot Realty",
  metadataBase: new URL(SITE_URL),
  title: "Chariot Realty — Bandra & BKC Prime Real Estate",
  description: "Verified prime rentals, corporate workspaces, and direct developer mandates across Bandra and BKC.",
  openGraph: {
    type: "website",
    url: SITE_URL,
    title: "Chariot Realty — Bandra & BKC Prime Real Estate",
    description: "Verified prime rentals, corporate workspaces, and direct developer mandates across Bandra and BKC.",
    images: [{ url: "/apple-touch-icon.png", width: 512, height: 512, alt: "Chariot Realty" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Chariot Realty — Bandra & BKC Prime Real Estate",
    description: "Verified prime rentals, corporate workspaces, and direct developer mandates across Bandra and BKC.",
    images: ["/apple-touch-icon.png"],
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: ["/favicon.ico", "/favicon.png"],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "Chariot Realty",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a1f44",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><PwaRegister />{children}</body>
    </html>
  );
}
