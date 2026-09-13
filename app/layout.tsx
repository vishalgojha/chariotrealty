import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chariot Realty — Bandra & BKC Prime Real Estate",
  description: "Verified prime rentals, corporate workspaces, and direct developer mandates across Bandra and BKC.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
