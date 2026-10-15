// Writes public descriptions for listings that do not have one yet, using the
// same OpenRouter generator the admin desk calls.
//
//   OPENROUTER_API_KEY=… SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//     npm run descriptions:backfill            # only rows missing a description
//     npm run descriptions:backfill -- --force # rewrite every published listing
//     npm run descriptions:backfill -- --dry-run
//     npm run descriptions:backfill -- --slug beau-pride-bandra-west
//
// Node strips the TypeScript types and scripts/alias-hook.mjs teaches it the
// "@/…" path alias, so the real modules are used rather than a copy of them.
import { priceParts } from "../lib/listing.ts";
import { descriptionNotes, generatePublicDescription } from "../lib/listing-description.ts";

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "";
if (!SUPABASE_URL || !KEY) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running.");
  process.exit(1);
}
if (!process.env.OPENROUTER_API_KEY) {
  console.error("Set OPENROUTER_API_KEY before running.");
  process.exit(1);
}

const args = process.argv.slice(2);
const force = args.includes("--force");
const dryRun = args.includes("--dry-run");
const slugIndex = args.indexOf("--slug");
const onlySlug = slugIndex !== -1 ? args[slugIndex + 1] : null;

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

const query = new URLSearchParams({ select: "*", status: "eq.published", order: "updated_at.desc" });
if (onlySlug) query.set("slug", `eq.${onlySlug}`);

const response = await fetch(`${SUPABASE_URL}/rest/v1/chariot_properties?${query}`, { headers });
if (!response.ok) {
  console.error(`Could not read listings: HTTP ${response.status} ${await response.text()}`);
  process.exit(1);
}
const rows = await response.json();

// Lays the facts out in the labels the generator expects. The area is collapsed
// the way the public listing does it: equal values drop, and one already named
// inside another drops, so "Hill Road Bandra West, Bandra West" reads once.
function areaPhrase(parts) {
  const kept = [];
  for (const part of parts.map((value) => (value || "").trim()).filter(Boolean)) {
    const lower = part.toLowerCase();
    if (kept.some((existing) => existing.toLowerCase().includes(lower))) continue;
    const shorter = kept.findIndex((existing) => lower.includes(existing.toLowerCase()));
    if (shorter !== -1) kept[shorter] = part;
    else kept.push(part);
  }
  return kept.join(", ");
}

function facts(row) {
  const fields = row.custom_fields || {};
  const price = priceParts({ price: row.price, priceValue: row.price_value, priceUnit: row.price_unit });
  const priceText = `${price.price}${price.note ? ` ${price.note}` : ""}`.trim();

  const area = areaPhrase([row.location, row.locality, row.micro_market]);

  const parking = Number(row.parking ?? fields.parking);
  const amenities = Array.isArray(fields.amenities)
    ? fields.amenities
    : typeof fields.amenities === "string"
      ? fields.amenities.split(",").map((item) => item.trim()).filter(Boolean)
      : [];

  return {
    name: (row.name || "").trim() || undefined,
    category: row.category,
    transaction: row.price_unit === "monthly_rent" ? "rent" : "sale",
    area: area || undefined,
    configuration: row.configuration || undefined,
    carpetAreaSqft: row.carpet_area_sqft ? Number(row.carpet_area_sqft) : undefined,
    price: priceText || undefined,
    parking: Number.isFinite(parking) && parking > 0 ? parking : undefined,
    possession: row.possession || undefined,
    reraApproved: row.rera_approved ?? undefined,
    amenities: amenities.length ? amenities.slice(0, 8) : undefined,
    highlights: [
      fields.balcony === 1 || fields.balcony === true ? "Balcony: yes" : "",
      fields.servant_room_washroom === true ? "Servant room with washroom: yes" : "",
    ].filter(Boolean),
  };
}

let written = 0;
let skipped = 0;

for (const row of rows) {
  if (row.custom_fields?.public_description && !force) {
    console.log(`skip  ${row.slug} (already has a description)`);
    skipped += 1;
    continue;
  }

  try {
    const description = await generatePublicDescription(descriptionNotes(facts(row)));
    if (dryRun) {
      console.log(`would ${row.slug}:\n  ${description}\n`);
      written += 1;
      continue;
    }

    const customFields = { ...(row.custom_fields || {}), public_description: description };
    const save = await fetch(`${SUPABASE_URL}/rest/v1/chariot_properties?id=eq.${row.id}`, {
      method: "PATCH",
      headers: { ...headers, Prefer: "return=minimal" },
      body: JSON.stringify({ custom_fields: customFields }),
    });
    if (!save.ok) throw new Error(`save failed: HTTP ${save.status} ${await save.text()}`);

    console.log(`ok   ${row.slug}: ${description}`);
    written += 1;
  } catch (error) {
    console.error(`FAIL ${row.slug}: ${error instanceof Error ? error.message : error}`);
  }
}

console.log(
  `\n${dryRun ? "Would write" : "Wrote"} ${written}, skipped ${rows.length - written}, of ${rows.length} published listing(s).`,
);
