import type { Metadata } from "next";

// A page can link only one manifest, and the desk needs an install target of
// its own: an installed copy of the internal pages used to open as the
// marketing site, because this manifest's start_url and scope are "/".
//
// So the marketing manifest is declared here, on the public routes, and the
// desk declares a second one in app/admin/layout.tsx. The root layout
// deliberately declares neither, or its link would win on every page.
export const metadata: Metadata = {
  manifest: "/manifest.webmanifest",
};

export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}