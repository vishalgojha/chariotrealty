import type { ChariotProperty } from "@/lib/inventory";
import type { Neighborhood, NeighborhoodFAQ } from "@/lib/neighborhoods";

export type JsonLd = Record<string, unknown>;

const SITE = "https://www.chariotrealty.in";
const LOGO = "https://www.chariotrealty.in/images.jpeg";
const PHONE_DISPLAY = "+91 97737 57759";
const PHONE_TEL = "+919773757759";
const CONTACT_KAPIL = "Kapil Gopal Ojha";
const OWNER_NAME = "Kapil Gopal Ojha";

const WHATSAPP = "https://wa.me/919773757759";
const INSTAGRAM = "https://www.instagram.com/chariotrealty.in";
const ADDRESS = {
  "@type": "PostalAddress",
  streetAddress: "Chariot Realty, Bandra West",
  addressLocality: "Bandra West",
  addressRegion: "Maharashtra",
  postalCode: "400050",
  addressCountry: "IN",
} as const;

const AREA_SERVED = [
  { "@type": "City", name: "Bandra West" },
  { "@type": "City", name: "Bandra East" },
  { "@type": "City", name: "Khar West" },
  { "@type": "City", name: "Santacruz West" },
  { "@type": "City", name: "Juhu" },
  { "@type": "City", name: "BKC" },
];

export function jsonLd(id: string, body: JsonLd): JsonLd {
  return { "@context": "https://schema.org", "@id": id, ...body };
}

/** Global Organization + RealEstateAgent (homepage + about). */
export function organizationJsonLd(): JsonLd[] {
  return [
    jsonLd(`${SITE}/#org`, {
      "@type": ["Organization", "RealEstateAgent"],
      name: "Chariot Realty",
      alternateName: "Chariot Realty — Malingo, Bandra & BKC",
      description:
        "Chariot Realty is a Mumbai real-estate agency for verified prime rentals, corporate residences, and Grade-A offices across Bandra West, Bandra East, Khar West, Santacruz West, Juhu, and BKC.",
      url: SITE,
      logo: LOGO,
      image: LOGO,
      telephone: PHONE_TEL,
      email: "hello@chariotrealty.in",
      foundingDate: "20181708",
      founder: { "@type": "Person", name: OWNER_NAME, jobTitle: "Principal Broker & Founder" },
      address: ADDRESS,
      areaServed: AREA_SERVED,
      contactPoint: [
        { "@type": "ContactPoint", contactType: "customer support", telephone: PHONE_TEL, areaServed: "Mumbai", availableLanguage: ["en", "hi"] },
        { "@type": "ContactPoint", contactType: "sales", telephone: PHONE_TEL, areaServed: "Mumbai Western Suburbs", availableLanguage: "en" },
      ],
      sameAs: [INSTAGRAM, "https://maps.google.com/?cid=ChIJz8JmDIuW5zsRksBZkC9qLE"],
      knowsAbout: ["Residential real estate in Mumbai", "Corporate rentals in BKC", "Grade-A office leasing in Bandra-Kurla Complex"],
      brand: { "@type": "Brand", name: "Chariot Realty" },
    }),
    jsonLd(`${SITE}/#agent`, {
      "@type": "Person",
      name: "Kapil Gopal Ojha",
      jobTitle: "Principal Broker & Founder, Chariot Realty",
      worksFor: { "@id": `${SITE}/#org` },
      telephone: PHONE_TEL,
      url: `${SITE}/about`,
      sameAs: [INSTAGRAM, WHATSAPP],
    }),
  ];
}

/** One neighborhood as a LocalBusiness + Neighborhood + Place bundle (breadcrumb + FAQ + geo). */
export function neighborhoodJsonLd(n: Neighborhood): JsonLd[] {
  const faqId = `${SITE}/neighborhoods/${n.slug}#faq`;
  const placeJson = {
    "@type": ["LocalBusiness", "RealEstateAgent", "Neighborhood", "Place"],
    "@id": `${SITE}/neighborhoods/${n.slug}#place`,
    name: n.name,
    description: n.intro?.[0]?.slice(0, 160) ?? `${n.name} property market in ${n.zone}, Mumbai.`,
    url: `${SITE}/neighborhoods/${n.slug}`,
    image: n.image,
    image2: LOGO,
    address: ADDRESS,
    geo: n.geo ? { "@type": "GeoCoordinates", latitude: n.geo.lat, longitude: n.geo.lng, radiusKm: n.geo.radiusKm } : undefined,
    areaServed: n.zone !== "BKC" ? { "@type": "City", name: n.name } : { "@type": "City", name: "BKC" },
    parentOrg: { "@id": `${SITE}/#org` },
    sameAs: [INSTAGRAM],
    additionalProperty: n.microMarkets?.length ? { "@type": "PropertyValue", name: "microMarkets", value: n.microMarkets.join(", ") } : undefined,
  };

  const faqJson: Record<string, unknown> = {
    "@type": "FAQPage",
    "@id": faqId,
    mainEntity: (n.faqs ?? []).map((f: NeighborhoodFAQ) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const breadcrumb = {
    "@type": "BreadcrumbList",
    "@id": `${SITE}/neighborhoods/${n.slug}#breadcrumb`,
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE },
      { "@type": "ListItem", position: 2, name: "Neighborhoods", item: `${SITE}/neighborhoods` },
      { "@type": "ListItem", position: 3, name: n.name, item: `${SITE}/neighborhoods/${n.slug}` },
    ],
  };

  return [placeJson, faqJson, breadcrumb].filter(Boolean) as JsonLd[];
}

/** One listing with property + offer + geo + breadcrumb (property detail pages). */
export function listingJsonLd(p: ChariotProperty): JsonLd[] {
  const url = `${SITE}/properties/${p.slug}`;
  const name = p.name ?? "Mumbai property";
  const specMap: Record<string, string | undefined> = {
    monthly_rent: "monthly_rent",
    per_sqft: "per_sqft",
    total_price: "total_price",
  };
  const priceSpecifier = specMap[p.priceUnit] ?? (p.priceValue && p.priceUnit !== "per_sqft" ? "total_price" : "per_sqft");

  const property = {
    "@type": ["Apartment", "RealEstateListing", "Product"],
    "@id": `${url}#listing`,
    name,
    description: p.description ?? `${p.name} — ${p.configuration ?? "residential"} in ${p.locality ?? p.location}, Mumbai. Available through Chariot Realty.`,
    url,
    image: p.image ? [p.image, LOGO] : [LOGO],
    location: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: p.locality,
        addressRegion: "Maharashtra",
        addressCountry: "IN",
      },
    },
    additionalProperty: [
      p.carpetAreaSqft ? { "@type": "PropertyValue", name: "carpetAreaSqft", value: p.carpetAreaSqft } : undefined,
      p.configuration ? { "@type": "PropertyValue", name: "configuration", value: p.configuration } : undefined,
      p.parking ? { "@type": "PropertyValue", name: "parking", value: p.parking } : undefined,
      p.possession ? { "@type": "PropertyValue", name: "possession", value: p.possession } : undefined,
    ].filter(Boolean),
    offers: {
      "@type": "Offer",
      price: p.priceValue ?? undefined,
      priceCurrency: p.currency ?? "INR",
      priceSpecification: { "@type": "PriceSpecification", price: p.priceValue ?? undefined, priceCurrency: p.currency ?? "INR", valueAddedTaxIncluded: true },
      availability: "https://schema.org/InStock",
      areaServed: { "@type": "Place", name: p.locality ?? "Mumbai" },
      seller: { "@id": `${SITE}/#org` },
    },
    broker: { "@id": `${SITE}/#org` },
    sourceOrganization: { "@id": `${SITE}/#org` },
  };

  const breadcrumb = {
    "@type": "BreadcrumbList",
    "@id": `${url}#breadcrumb`,
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE },
      { "@type": "ListItem", position: 2, name: "Inventory", item: `${SITE}/#inventory` },
      { "@type": "ListItem", position: 3, name: name, item: url },
    ],
  };

  return [property, breadcrumb];
}

/** Reusable FAQPage JSON-LD for about + neighborhoods index. */
export function faqJsonLd(id: string, faqs: NeighborhoodFAQ[]): JsonLd {
  return jsonLd(id, {
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  });
}

/** Organization + LocalBusiness + Review/aggregate for the neighborhood index page. */
export function neighborhoodsIndexJsonLd(): JsonLd[] {
  return [
    ...organizationJsonLd(),
    jsonLd(`${SITE}/neighborhoods#entity`, {
      "@type": "CollectionPage",
      name: "Mumbai Neighborhoods — Bandra to BKC",
      hasPart: mumbaiNeighborhoodSlugs.map((slug) => ({ "@type": "LocalBusiness", name: slug, url: `${SITE}/neighborhoods/${slug}` })),
    }),
  ];
}

export const mumbaiNeighborhoodSlugs = [
  "bandra-west",
  "bandra-east",
  "khar-west",
  "santacruz-west",
  "juhu",
  "bkc",
] as const;

export function canonical(hostname?: string): string {
  return hostname ? `https://${hostname.replace(/^www\./, "www.")}` : SITE;
}
