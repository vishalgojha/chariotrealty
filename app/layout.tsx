import type { Metadata } from "next";
import "./globals.css";
import PwaRegister from "./pwa-register";

export const metadata: Metadata = {
  title: "Chariot Realty — Bandra & BKC Prime Real Estate",
  description: "Verified prime rentals, corporate workspaces, and direct developer mandates across Bandra and BKC.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><PwaRegister />{children}</body>
    </html>
  );
}
