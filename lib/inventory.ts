import { type MumbaiProperty } from "@/lib/mumbai";
export type ChariotProperty = Omit<MumbaiProperty, "status"> & {
  status: string;
  description?: string;
  source?: string;
  mediaType?: "image" | "video";
  images?: string[];
  customFields?: Record<string, unknown>;
};

export type InventoryRead = {
  properties: ChariotProperty[];
  degraded: boolean;
  reason: string | null;
};

function config() { return { url: (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, ""), key: process.env.SUPABASE_SERVICE_ROLE_KEY || "" }; }
function mapRow(row: any): ChariotProperty { return { id: row.id, slug: row.slug, name: row.name, category: row.category, locality: row.locality, microMarket: row.micro_market, city: "Mumbai", zone: row.micro_market === "BKC" ? "BKC" : row.locality === "Bandra East" ? "Bandra East" : "Western Suburbs", location: row.location, price: row.price, priceValue: Number(row.price_value || 0), priceUnit: row.price_unit || "total_price", currency: "INR", carpetAreaSqft: Number(row.carpet_area_sqft || 0), configuration: row.configuration || undefined, parking: row.parking || undefined, possession: row.possession || undefined, reraApproved: row.rera_approved ?? undefined, image: row.image_url || undefined, mediaType: row.media_type || "image", images: (row.images as string[] | undefined) || undefined, customFields: row.custom_fields && typeof row.custom_fields === "object" ? row.custom_fields : undefined, status: row.status, description: row.description || undefined, source: row.source || undefined }; }

// If the database cannot be read we return nothing at all. The seed data in
// lib/mumbai.ts used to be served as published inventory here, which put three
// invented properties on the public site whenever the database was unreachable.
// A visitor could enquire about a listing that does not exist, and a build run
// during an outage would bake those fake pages into the prerender output. An
// empty result is also ambiguous, so every caller uses readInventory to tell a
// genuinely empty inventory apart from a broken one and say so.
function degraded(reason: string): InventoryRead {
  console.error(`[inventory] DEGRADED: database unavailable, serving no listings. Reason: ${reason}`);
  return { properties: [], degraded: true, reason };
}

export async function readInventory(): Promise<InventoryRead> {
  const { url, key } = config();
  if (!url || !key) return degraded("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set");

  let response: Response;
  try {
    response = await fetch(`${url}/rest/v1/chariot_properties?select=*&status=eq.published&order=published_at.desc,created_at.desc`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store" });
  } catch (error) {
    return degraded(`request to ${url} failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    return degraded(`${url} returned HTTP ${response.status} ${response.statusText}${body ? ` - ${body.slice(0, 300)}` : ""}`);
  }

  const rows = await response.json();
  if (!Array.isArray(rows)) return degraded(`${url} returned ${typeof rows} instead of an array`);

  const images = await readImages(url, key);
  return {
    properties: rows.map((row) => ({ ...mapRow(row), images: images.get(String(row.id)) })),
    degraded: false,
    reason: null,
  };
}

// The gallery lives in its own table so a listing can carry several photos.
// It is read separately from the listing query on purpose: this is what powers
// the detail carousel, and a failure here must never cost us the listings
// themselves, so any error falls back to the single image_url column.
async function readImages(url: string, key: string): Promise<Map<string, string[]>> {
  const grouped = new Map<string, string[]>();
  try {
    const response = await fetch(`${url}/rest/v1/chariot_property_images?select=property_id,public_url&order=sort_order.asc`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    if (!response.ok) {
      console.error(`[inventory] gallery unavailable (HTTP ${response.status}), falling back to image_url`);
      return grouped;
    }
    const rows = await response.json();
    if (!Array.isArray(rows)) return grouped;
    for (const row of rows) {
      if (!row?.property_id || !row?.public_url) continue;
      const list = grouped.get(String(row.property_id)) ?? [];
      list.push(String(row.public_url));
      grouped.set(String(row.property_id), list);
    }
  } catch (error) {
    console.error(`[inventory] gallery read failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  return grouped;
}

export async function listPublishedProperties(): Promise<ChariotProperty[]> {
  return (await readInventory()).properties;
}

// chariot_properties.id is the only uuid column on the table. The admin form
// starts as id: "" and spreads the whole form into the request, so an empty
// string reached the insert and Postgres rejected the entire save with
// "invalid input syntax for type uuid: ''". An unset uuid column is omitted
// rather than sent as "", which is also what a create wants: the id is
// generated by the database, and on an update the id in the URL is
// authoritative.
export const UUID_COLUMNS = ["id"] as const;

export function omitEmptyUuids<T extends Record<string, unknown>>(payload: T): Partial<T> {
  const cleaned: Record<string, unknown> = { ...payload };
  for (const column of UUID_COLUMNS) {
    const value = cleaned[column];
    if (value === "" || value === null || value === undefined) delete cleaned[column];
  }
  return cleaned as Partial<T>;
}
