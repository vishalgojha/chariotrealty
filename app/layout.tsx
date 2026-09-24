import type { Metadata, Viewport } from "next";
import "./globals.css";
import PwaRegister from "./pwa-register";

export const metadata: Metadata = {
  applicationName: "Chariot Realty",
  title: "Chariot Realty — Bandra & BKC Prime Real Estate",
  description: "Verified prime rentals, corporate workspaces, and direct developer mandates across Bandra and BKC.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: ["/images.jpeg", "/icon.svg"],
    apple: "/images.jpeg",
  },
  appleWebApp: {
    capable: true,
    title: "Chariot Realty",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b1f3a",
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
