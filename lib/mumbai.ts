export type PropertyCategory = "residential" | "commercial" | "under-construction";

export type MumbaiProperty = {
  id: string;
  slug: string;
  name: string;
  category: PropertyCategory;
  locality: string;
  microMarket: string;
  city: "Mumbai";
  zone: "Western Suburbs" | "BKC" | "Bandra East";
  location: string;
  price: string;
  priceValue: number;
  priceUnit: "monthly_rent" | "per_sqft" | "total_price";
  currency: "INR";
  carpetAreaSqft: number;
  configuration?: string;
  parking?: number;
  possession?: string;
  reraApproved?: boolean;
  image?: string;
  status: "available";
};

export const mumbaiProperties: MumbaiProperty[] = [
  {
    id: "ten-bkc",
    slug: "ten-bkc",
    name: "Ten BKC",
    category: "residential",
    locality: "Bandra East",
    microMarket: "Kalanagar",
    city: "Mumbai",
    zone: "BKC",
    location: "Kalanagar, Bandra East",
    price: "₹2.80L / mo",
    priceValue: 280000,
    priceUnit: "monthly_rent",
    currency: "INR",
    carpetAreaSqft: 1100,
    configuration: "3 BHK",
    parking: 2,
    image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80",
    status: "available",
  },
  {
    id: "godrej-bkc",
    slug: "godrej-bkc",
    name: "Godrej BKC",
    category: "commercial",
    locality: "BKC",
    microMarket: "G-Block",
    city: "Mumbai",
    zone: "BKC",
    location: "G-Block BKC",
    price: "₹285 / sqft",
    priceValue: 285,
    priceUnit: "per_sqft",
    currency: "INR",
    carpetAreaSqft: 4200,
    parking: 6,
    status: "available",
  },
  {
    id: "rustomjee-cleon",
    slug: "rustomjee-cleon",
    name: "Rustomjee Cleon",
    category: "under-construction",
    locality: "Bandra East",
    microMarket: "Kalanagar",
    city: "Mumbai",
    zone: "Bandra East",
    location: "Bandra East",
    price: "From ₹4.25 Cr",
    priceValue: 42500000,
    priceUnit: "total_price",
    currency: "INR",
    carpetAreaSqft: 685,
    configuration: "2 & 3 BHK",
    possession: "Q4 2026",
    reraApproved: true,
    image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
    status: "available",
  },
];

export const mumbaiMicroMarkets = [
  { slug: "bandra-west", name: "Bandra West", zone: "Western Suburbs", positioning: "Luxury residences, sea-facing homes, and premium rentals", transit: ["Bandra Station", "Western Express Highway"] },
  { slug: "bandra-east", name: "Bandra East", zone: "Bandra East", positioning: "BKC-adjacent residences and new development", transit: ["BKC Connector", "Bandra Station"] },
  { slug: "bkc", name: "BKC", zone: "BKC", positioning: "Grade-A offices, corporate residences, and financial district access", transit: ["BKC", "Bandra-Kurla Connector"] },
  { slug: "khar", name: "Khar", zone: "Western Suburbs", positioning: "Established premium residential neighbourhood", transit: ["Khar Road Station", "Linking Road"] },
  { slug: "santacruz", name: "Santacruz", zone: "Western Suburbs", positioning: "Airport-connected homes and commercial corridors", transit: ["Santacruz Station", "Western Express Highway"] },
];

export function normalizeSearch(value: string | null) {
  return value?.trim().toLowerCase() ?? "";
}
