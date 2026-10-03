import { NextRequest, NextResponse } from "next/server";
import { normalizeSearch, type PropertyCategory } from "@/lib/mumbai";
import { readInventory } from "@/lib/inventory";
import { listingDescription, publicCustomFields } from "@/lib/listing";

const supportedCategories: PropertyCategory[] = ["residential", "commercial", "under-construction"];
const categories = new Set<PropertyCategory>(supportedCategories);

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const category = normalizeSearch(searchParams.get("category"));
  const locality = normalizeSearch(searchParams.get("locality"));
  const configuration = normalizeSearch(searchParams.get("configuration"));
  const minCarpet = Number(searchParams.get("minCarpet") || 0);
  const maxCarpet = Number(searchParams.get("maxCarpet") || Number.MAX_SAFE_INTEGER);

  if (category && !categories.has(category as PropertyCategory)) {
    return NextResponse.json({ error: "Unsupported category", supported: supportedCategories }, { status: 400 });
  }

  const { properties: all, degraded } = await readInventory();
  if (degraded) {
    return NextResponse.json(
      { error: "Listings are temporarily unavailable. Please try again shortly.", degraded: true },
      { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "120" } },
    );
  }

  const properties = all.filter((property) => {
    const localityMatch = !locality || [property.locality, property.microMarket, property.location, property.zone].some((field) => normalizeSearch(field).includes(locality));
    const configMatch = !configuration || normalizeSearch(property.configuration ?? "").includes(configuration);
    return (!category || property.category === category) && localityMatch && configMatch && property.carpetAreaSqft >= minCarpet && property.carpetAreaSqft <= maxCarpet;
  });

  // The stored row is an internal record, not a public document. The source
  // message it was parsed from can name the broker and their number, so the
  // public payload is rebuilt from structured fields and an allowlist of
  // custom_fields. Anything not on that allowlist never leaves the server.
  const publicProperties = properties.map((property) => {
    const { description: _description, source: _source, customFields: _customFields, ...safeProperty } = property;
    return { ...safeProperty, description: listingDescription(property), customFields: publicCustomFields(property) };
  });

  return NextResponse.json({
    city: "Mumbai",
    market: "Bandra · BKC · Western Suburbs",
    count: properties.length,
    filters: { category: category || null, locality: locality || null, configuration: configuration || null, minCarpet, maxCarpet: maxCarpet === Number.MAX_SAFE_INTEGER ? null : maxCarpet },
    data: publicProperties,
  }, { headers: { "Cache-Control": "no-store" } });
}
