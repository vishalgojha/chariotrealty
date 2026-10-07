import type { Metadata, Viewport } from "next";
import "./globals.css";
import PwaRegister from "./pwa-register";

export const metadata: Metadata = {
  applicationName: "Chariot Realty",
  title: "Chariot Realty — Bandra & BKC Prime Real Estate",
  description: "Verified prime rentals, corporate workspaces, and direct developer mandates across Bandra and BKC.",
  // No manifest here. Only one can apply per page, and the public site and the
  // desk each need their own; they are declared in their own layouts.
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
