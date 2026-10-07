import type { ChariotProperty } from "@/lib/inventory";
import { PUBLIC_DESCRIPTION_KEY, rowIdentityTerms, sanitizePublicCopy } from "@/lib/public-copy";

export type Category = "residential" | "commercial" | "under-construction";
export type PriceUnit = "monthly_rent" | "per_sqft" | "total_price";

export const WHATSAPP_NUMBER = "919773757759";
export const WHATSAPP = `https://wa.me/${WHATSAPP_NUMBER}`;
export const PHONE_TEL = "+919773757759";
export const PHONE_DISPLAY = "+91 97737 57759";

/**
 * Every public listing is attributed to Kapil.
 *
 * Listings reach us from brokers and WhatsApp groups, and the sender is recorded
 * internally so we know who to credit and follow up with. None of that is
 * published: the page presents Kapil as the contact, so a third party never has
 * to be named or called from our site.
 */
export const LISTING_CREDIT = {
  name: "Kapil Gopal Ojha",
  role: "Principal Broker & Founder, Chariot Realty",
  phone: PHONE_DISPLAY,
  tel: PHONE_TEL,
  whatsapp: `https://wa.me/${WHATSAPP_NUMBER}`,
} as const;

export const CATEGORY_LABEL: Record<Category, string> = {
  residential: "Residential",
  commercial: "Commercial",
  "under-construction": "Under Construction",
};

export function formatShortInr(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "";
  if (value >= 1e7) return `₹${(value / 1e7).toFixed(2)} Cr`;
  if (value >= 1e5) return `₹${(value / 1e5).toFixed(2)}L`;
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

// Listing prices arrive as free text from the database, so the same property can
// be stored as "₹2.80L / mo", "2.90 lacs" or "₹6,00,000/mo". Everything is
// rewritten to one notation so the cards never mix formats.
export function normalizePriceText(value: string): string {
  const text = value.trim();

  const crore = text.match(/₹?\s*([\d,.]+)\s*(?:cr|crores?)\b/i);
  if (crore) {
    const amount = Number.parseFloat(crore[1].replace(/,/g, "")) * 1e7;
    const formatted = formatShortInr(amount);
    if (formatted) return text.replace(crore[0], formatted);
  }

  const lakh = text.match(/₹?\s*([\d,.]+)\s*(?:l|lacs?|lakhs?)\b/i);
  if (lakh) {
    const amount = Number.parseFloat(lakh[1].replace(/,/g, "")) * 1e5;
    const formatted = formatShortInr(amount);
    if (formatted) return text.replace(lakh[0], formatted);
  }

  const number = text.match(/[\d,]+(?:\.\d+)?/);
  if (!number) return text;
  const amount = Number.parseFloat(number[0].replace(/,/g, ""));
  return formatShortInr(amount) || text;
}

export function priceParts(property: { price?: string; priceValue?: number; priceUnit?: string }): { price: string; note?: string } {
  const isRental =
    property.priceUnit === "monthly_rent" ||
    /\/\s*mo(?:nth)?(?:ly)?\b|\b(?:per\s+month|monthly)\b/i.test(property.price ?? "");
  if (isRental) {
    const numeric = property.priceValue ? formatShortInr(property.priceValue) : normalizePriceText(property.price ?? "");
    const amount = numeric.replace(/\s*(?:\/\s*mo(?:nth)?(?:ly)?\.?|per\s+month|monthly)\s*$/i, "").trim();
    return { price: amount, note: "/ mo" };
  }
  if (property.priceUnit === "per_sqft") {
    const numeric = property.priceValue ? `₹${property.priceValue.toLocaleString("en-IN")}` : normalizePriceText(property.price ?? "");
    return { price: numeric.replace(/\s*(?:\/\s*)?(?:per\s+)?sq\.?\s*ft\.?$/i, "").trim(), note: "/ sqft" };
  }
  const fallback = formatShortInr(property.priceValue ?? 0);
  const raw = property.price?.trim();
  if (!raw) return { price: fallback ? `From ${fallback}` : "Price on request" };
  const normalized = normalizePriceText(raw);
  const bareNumber = /^[\s₹]*[\d,.]+\s*$/.test(raw);
  return { price: bareNumber && normalized !== raw ? `From ${normalized}` : normalized };
}

export type ListingMedia = { url: string; type: "image" | "video" };
export type ListingFact = { label: string; value: string };
export type ListingMediaLink = { label: "Instagram Reel" | "Google Drive Photos"; href: string };

export type Listing = {
  slug: string;
  category: Category;
  name: string;
  location: string;
  area: string;
  price: string;
  priceNote?: string;
  summary: string;
  badge: string;
  badgeTone: "verified" | "green" | "neutral";
  media: ListingMedia[];
  facts: ListingFact[];
  amenities: string[];
  description?: string;
  priceValue: number;
  priceUnit: PriceUnit;
  carpetAreaSqft: number;
  configuration?: string;
  possession?: string;
  waMessage: string;
  mediaLinks: ListingMediaLink[];
  specsLine: string;
  tagline?: string;
};

export function waLink(message: string): string {
  return `${WHATSAPP}?text=${encodeURIComponent(message)}`;
}

function areaChip(row: ChariotProperty): string {
  return row.microMarket || row.locality || row.zone || "";
}

/**
 * The area named in a sentence, e.g. "Bandra East" or "Kalanagar, Bandra East".
 *
 * Locality and micro-market usually hold the same value, and joining them
 * unconditionally produced "Khar West · Khar West" on live listings. Equal
 * values collapse, and a pair where one is already inside the other collapses
 * too, since "Bandra East, Bandra East" says nothing the first half did not.
 */
function areaPhrase(row: ChariotProperty): string {
  const parts = [row.location, row.locality, row.microMarket]
    .map((part) => (part || "").trim())
    .filter(Boolean);
  const kept: string[] = [];
  for (const part of parts) {
    const lower = part.toLowerCase();
    if (kept.some((existing) => existing.toLowerCase().includes(lower))) continue;
    const shorter = kept.findIndex((existing) => lower.includes(existing.toLowerCase()));
    if (shorter !== -1) kept[shorter] = part;
    else kept.push(part);
  }
  return kept.join(", ") || "Mumbai";
}

function listingMedia(row: ChariotProperty): ListingMedia[] {
  const urls = [...(row.images ?? []), row.image].filter((url): url is string => Boolean(url));
  const unique = Array.from(new Set(urls));
  return unique.map((url) => ({ url, type: (row.mediaType ?? "image") as "image" | "video" }));
}

// A parsed listing is still attached to the message it came from, and that
// message carries the sender's name, phone number, group name and timestamp.
// None of that belongs on a public page, so any text coming out of a parsed
// field is checked before a visitor can see it. Structured columns are trusted;
// free text from the source message is not.
const CONTACT_PATTERN = /(?:\+?\d[\d\s().-]{7,}\d)|(?:[\w.+-]+@[\w-]+\.[\w.]+)|(?:wa\.me\/\d+)/i;

export function containsSourceContact(value: string): boolean {
  return CONTACT_PATTERN.test(value);
}

export function publicTextList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0 && !containsSourceContact(item));
}

const PUBLIC_LIST_KEYS = ["amenities", "unit_amenities", "building_amenities"] as const;
const PUBLIC_URL_KEYS = ["reel_url", "instagram_reel_url", "drive_url", "drive_photos_url"] as const;
const PUBLIC_TEXT_KEYS = [PUBLIC_DESCRIPTION_KEY] as const;

// Everything the public API is allowed to echo back from custom_fields. Anything
// not on this list stays server-side, so a new parsed field cannot quietly start
// publishing broker contact details.
export function publicCustomFields(row: ChariotProperty): Record<string, unknown> | undefined {
  const fields = row.customFields;
  if (!fields) return undefined;
  const safe: Record<string, unknown> = {};
  for (const key of PUBLIC_LIST_KEYS) {
    const list = publicTextList(fields[key]);
    if (list.length) safe[key] = list;
  }
  for (const key of PUBLIC_URL_KEYS) {
    const value = fields[key];
    if (typeof value === "string" && /^https?:\/\//i.test(value)) safe[key] = value;
  }
  for (const key of PUBLIC_TEXT_KEYS) {
    const text = sanitizePublicCopy(typeof fields[key] === "string" ? String(fields[key]) : "", rowIdentityTerms(row));
    if (text) safe[key] = text;
  }
  return Object.keys(safe).length ? safe : undefined;
}

function customList(row: ChariotProperty, keys: string[]): string[] {
  for (const key of keys) {
    const list = publicTextList(row.customFields?.[key]);
    if (list.length) return list;
  }
  return [];
}

function customUrl(row: ChariotProperty, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = row.customFields?.[key];
    if (typeof value === "string" && /^https?:\/\//i.test(value)) return value;
  }
  return undefined;
}

/**
 * The configuration as it should read in a sentence.
 *
 * A bare number is what a dictated or typed listing ends up with, and "3,
 * 1,430 sqft carpet area property" says nothing useful, so a residential count
 * is completed to "3 BHK". Anything already carrying a unit is left alone.
 */
function configurationFact(row: ChariotProperty): string | undefined {
  const raw = (row.configuration || "").trim();
  if (!raw) return undefined;
  if (/^\d+(?:\.\d+)?$/.test(raw)) {
    return row.category === "commercial" ? raw : `${raw} BHK`;
  }
  return raw;
}

export function listingDescription(row: ChariotProperty): string {
  // A generated description is preferred when one exists, but it is sanitised
  // again here rather than trusted: the same key can be filled in by hand, and
  // the stored description column still holds the source message.
  const generated = sanitizePublicCopy(
    typeof row.customFields?.[PUBLIC_DESCRIPTION_KEY] === "string"
      ? String(row.customFields?.[PUBLIC_DESCRIPTION_KEY])
      : "",
    rowIdentityTerms(row),
  );
  if (generated) return generated;

  const price = priceParts(row);
  const facts = [
    configurationFact(row),
    row.carpetAreaSqft ? `${row.carpetAreaSqft.toLocaleString("en-IN")} sqft carpet area` : undefined,
    row.parking ? `${row.parking} covered parking ${row.parking === 1 ? "space" : "spaces"}` : undefined,
  ].filter(Boolean);
  const name = (row.name || "").trim() || "This property";
  const sentence = facts.length
    ? `${name} is a ${facts.join(", ")} property in ${areaPhrase(row)}.`
    : `${name} is a property in ${areaPhrase(row)}.`;
  const pricing = price.price ? ` It is listed at ${price.price}${price.note ? ` ${price.note}` : ""}.` : "";
  const status = row.possession ? ` Possession: ${row.possession}.` : row.reraApproved ? " RERA approved." : "";
  return `${sentence}${pricing}${status}`;
}

export function toListing(row: ChariotProperty): Listing {
  const price = priceParts(row);
  const area = areaChip(row);
  const location = (row.location || "").trim() || [row.locality, row.zone].filter(Boolean).join(" · ");

  const badgeTone: Listing["badgeTone"] =
    row.category === "commercial" ? "neutral" : "verified";
  const badge =
    row.category === "under-construction"
      ? row.possession
        ? `Possession ${row.possession}`
        : "New Launch"
      : row.category === "commercial"
        ? "Grade-A Office"
        : "Verified";

  const facts: ListingFact[] = [];
  if (row.configuration) facts.push({ label: "Config", value: row.configuration });
  if (row.carpetAreaSqft) facts.push({ label: "Carpet", value: `${row.carpetAreaSqft.toLocaleString("en-IN")} sqft` });
  if (row.parking) facts.push({ label: "Parking", value: `${row.parking} covered` });
  if (row.possession) facts.push({ label: "Possession", value: row.possession });
  if (row.reraApproved) facts.push({ label: "RERA", value: "Approved" });

  const backendAmenities = customList(row, ["amenities", "unit_amenities", "building_amenities"]);
  const amenities = backendAmenities.length ? backendAmenities : [];
  const mediaLinks: ListingMediaLink[] = [];
  const reelUrl = customUrl(row, ["reel_url", "instagram_reel_url", "instagram"]);
  const imageUrl = row.image || "";
  const imageReelUrl = imageUrl.includes("instagram.com") ? imageUrl : undefined;
  const driveUrl = customUrl(row, ["drive_url", "drive_photos_url", "photos_url"]);
  if (reelUrl) mediaLinks.push({ label: "Instagram Reel", href: reelUrl });
  else if (imageReelUrl) mediaLinks.push({ label: "Instagram Reel", href: imageReelUrl });
  else if (driveUrl) mediaLinks.push({ label: "Google Drive Photos", href: driveUrl });

  const priceText = `${price.price}${price.note ? ` ${price.note}` : ""}`;
  const specsLine = [row.configuration, row.carpetAreaSqft ? `${row.carpetAreaSqft.toLocaleString("en-IN")} sqft` : ""]
    .filter(Boolean)
    .join(" • ");
  const tagline = typeof row.customFields?.tagline === "string"
    ? sanitizePublicCopy(row.customFields.tagline, rowIdentityTerms(row)) || undefined
    : undefined;

  return {
    slug: row.slug,
    category: row.category,
    name: (row.name || "").trim(),
    location,
    area,
    price: price.price,
    priceNote: price.note,
    summary: [row.configuration, row.carpetAreaSqft ? `${row.carpetAreaSqft.toLocaleString("en-IN")} sqft` : "", priceText]
      .filter(Boolean)
      .join(" • "),
    badge,
    badgeTone,
    media: listingMedia(row),
    facts,
    amenities,
    description: listingDescription(row),
    priceValue: Number(row.priceValue || 0),
    priceUnit: (row.priceUnit || "total_price") as PriceUnit,
    carpetAreaSqft: Number(row.carpetAreaSqft || 0),
    configuration: row.configuration,
    possession: row.possession,
    waMessage: `Hi Kapil, I'm interested in ${(row.name || "").trim()} (${area || row.locality}, ${priceText}).`,
    mediaLinks,
    specsLine,
    tagline,
  };
}

export type PriceCard = { label: string; price: string; note: string };

// The detail page shows the headline price plus one derived figure. Both come
// from stored numbers, never from invented copy.
export function priceCards(listing: Listing): PriceCard[] {
  const rental = listing.priceUnit === "monthly_rent";
  const headline: PriceCard = {
    label: rental ? "Monthly rent" : listing.priceUnit === "per_sqft" ? "Rate" : "Asking price",
    price: `${listing.price}${listing.priceNote ? ` ${listing.priceNote}` : ""}`,
    note: listing.carpetAreaSqft ? `${listing.carpetAreaSqft.toLocaleString("en-IN")} sqft carpet area` : "Carpet area on request",
  };

  if (!listing.carpetAreaSqft || !listing.priceValue) {
    return [headline, { label: "Status", price: listing.possession ?? "Ready to move", note: "Contact Kapil for the full cost sheet" }];
  }

  if (listing.priceUnit === "per_sqft") {
    return [
      headline,
      {
        label: "Implied total",
        price: formatShortInr(listing.priceValue * listing.carpetAreaSqft),
        note: `₹${listing.priceValue.toLocaleString("en-IN")} sqft × ${listing.carpetAreaSqft.toLocaleString("en-IN")} sqft`,
      },
    ];
  }

  const perSqft = listing.priceValue / listing.carpetAreaSqft;
  return [
    headline,
    {
      label: "Per sqft",
      price: `${formatShortInr(perSqft)}${rental ? " / sqft / mo" : " / sqft"}`,
      note: rental ? "Monthly rate on carpet area" : "Rate on carpet area",
    },
  ];
}

export type ListingFilter = "all" | "buy" | "rent" | "commercial" | "under-construction";

export const LISTING_FILTERS: { value: ListingFilter; label: string }[] = [
  { value: "all", label: "All listings" },
  { value: "buy", label: "For Sale" },
  { value: "rent", label: "For Rent" },
  { value: "commercial", label: "Commercial" },
  { value: "under-construction", label: "Under Construction" },
];

export function matchesFilter(listing: Listing, filter: ListingFilter): boolean {
  if (filter === "all") return true;
  if (filter === "commercial") return listing.category === "commercial";
  if (filter === "rent") return listing.priceUnit === "monthly_rent";
  if (filter === "under-construction") return listing.category === "under-construction";
  return listing.priceUnit !== "monthly_rent" && listing.category !== "commercial";
}

export function searchListings(listings: Listing[], query: string): Listing[] {
  const term = query.trim().toLowerCase();
  if (!term) return listings;
  return listings.filter((listing) =>
    [listing.name, listing.location, listing.area, listing.summary, listing.configuration ?? "", CATEGORY_LABEL[listing.category]]
      .join(" ")
      .toLowerCase()
      .includes(term),
  );
}
