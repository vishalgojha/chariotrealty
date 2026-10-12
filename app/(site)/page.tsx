import { readSiteContent } from "@/lib/site-content";
import type { Listing } from "@/lib/listing";
import { HomeClient } from "@/components/home-client";

import { toListing } from "@/lib/listing";

async function getListings(): Promise<Listing[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://chariotrealty.in";
    const res = await fetch(`${baseUrl}/api/properties`, {
      cache: "no-store",
    });
    if (!res.ok) {
      console.log("Listings fetched:", 0);
      return [];
    }
    const data = await res.json();
    const list = Array.isArray(data?.data) ? data.data : Array.isArray(data?.listings) ? data.listings : [];
    console.log("Listings fetched:", list.length);
    return list.map((p: any) => toListing(p));
  } catch (e) {
    console.error("Failed to fetch listings:", e);
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
