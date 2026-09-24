import type { MetadataRoute } from "next";
import { canonical, mumbaiNeighborhoodSlugs } from "@/lib/seo";
import { listPublishedProperties } from "@/lib/inventory";

const d = new Date();

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = canonical();
  const listings = await listPublishedProperties();

  const staticUrls = [
    { url: `${site}/`, lastModified: d, changeFrequency: "weekly" as const, priority: 1 },
    { url: `${site}/neighborhoods`, lastModified: d, changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${site}/about`, lastModified: d, changeFrequency: "yearly" as const, priority: 0.6 },
  ];

  const neighborhoodUrls = mumbaiNeighborhoodSlugs.map((slug) => ({
    url: `${site}/neighborhoods/${slug}`,
    lastModified: d,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const listingUrls = listings.map((p) => ({
    url: `${site}/properties/${p.slug}`,
    lastModified: d,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...staticUrls, ...neighborhoodUrls, ...listingUrls];
}
