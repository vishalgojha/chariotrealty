import { readSiteContent } from "@/lib/site-content";
import type { Listing } from "@/lib/listing";
import { HomeClient } from "@/components/home-client";

async function getListings(): Promise<Listing[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/properties`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) {
      return [];
    }
    const data = await res.json();
    if (Array.isArray(data?.listings)) {
      return data.listings;
    }
    return [];
  } catch {
    return [];
  }
}

async function getAboutUs() {
  try {
    const content = await readSiteContent("about_us");
    return content;
  } catch {
    return null;
  }
}

export default async function Home() {
  const [listings, aboutUs] = await Promise.all([
    getListings(),
    getAboutUs(),
  ]);

  return <HomeClient initialListings={listings} />;
}
