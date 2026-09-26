import { NextRequest, NextResponse } from "next/server";
import { mumbaiProperties, normalizeSearch, type PropertyCategory } from "@/lib/mumbai";
import { listPublishedProperties } from "@/lib/inventory";

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

  const properties = (await listPublishedProperties()).filter((property) => {
    const localityMatch = !locality || [property.locality, property.microMarket, property.location, property.zone].some((field) => normalizeSearch(field).includes(locality));
    const configMatch = !configuration || normalizeSearch(property.configuration ?? "").includes(configuration);
    return (!category || property.category === category) && localityMatch && configMatch && property.carpetAreaSqft >= minCarpet && property.carpetAreaSqft <= maxCarpet;
  });

  return NextResponse.json({
    city: "Mumbai",
    market: "Bandra · BKC · Western Suburbs",
    count: properties.length,
    filters: { category: category || null, locality: locality || null, configuration: configuration || null, minCarpet, maxCarpet: maxCarpet === Number.MAX_SAFE_INTEGER ? null : maxCarpet },
    data: properties,
  }, { headers: { "Cache-Control": "no-store" } });
}
