import { readSiteContent } from "@/lib/site-content";
import type { Listing } from "@/lib/listing";
import { HomeClient } from "@/components/home-client";

import { readInventory } from "@/lib/inventory";

async function getListings(): Promise<Listing[]> {
  try {
    const { properties } = await readInventory();
    console.log("Listings fetched:", properties.length);
    return properties as unknown as Listing[];
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
