import { mumbaiProperties, type MumbaiProperty } from "@/lib/mumbai";
export type ChariotProperty = Omit<MumbaiProperty, "status"> & { status: string; description?: string; source?: string; mediaType?: "image" | "video" };
function config() { return { url: (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, ""), key: process.env.SUPABASE_SERVICE_ROLE_KEY || "" }; }
function mapRow(row: any): ChariotProperty { return { id: row.id, slug: row.slug, name: row.name, category: row.category, locality: row.locality, microMarket: row.micro_market, city: "Mumbai", zone: row.micro_market === "BKC" ? "BKC" : row.locality === "Bandra East" ? "Bandra East" : "Western Suburbs", location: row.location, price: row.price, priceValue: Number(row.price_value || 0), priceUnit: row.price_unit || "total_price", currency: "INR", carpetAreaSqft: Number(row.carpet_area_sqft || 0), configuration: row.configuration || undefined, parking: row.parking || undefined, possession: row.possession || undefined, reraApproved: row.rera_approved ?? undefined, image: row.image_url || undefined, mediaType: row.media_type || "image", status: row.status, description: row.description || undefined, source: row.source || undefined }; }
// The static seed data is a last resort, not a mirror. Serving it quietly once
// hid a production misconfiguration for weeks (wrong Supabase project, so every
// real listing vanished and the site looked healthy). Every path that falls back
// says so loudly, with the reason, so it shows up in logs instead of in a demo.
function staticFallback(reason: string): ChariotProperty[] {
  console.error(`[inventory] DEGRADED: serving static seed data instead of the database. Reason: ${reason}`);
  return mumbaiProperties.map((item) => ({ ...item, status: "published", source: "static" }));
}

export async function listPublishedProperties(): Promise<ChariotProperty[]> {
  const { url, key } = config();
  if (!url || !key) return staticFallback("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set");

  let response: Response;
  try {
    response = await fetch(`${url}/rest/v1/chariot_properties?select=*&status=eq.published&order=published_at.desc,created_at.desc`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store" });
  } catch (error) {
    return staticFallback(`request to ${url} failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    return staticFallback(`${url} returned HTTP ${response.status} ${response.statusText}${body ? ` - ${body.slice(0, 300)}` : ""}`);
  }

  const rows = await response.json();
  if (!Array.isArray(rows)) return staticFallback(`${url} returned ${typeof rows} instead of an array`);
  return rows.map(mapRow);
}
