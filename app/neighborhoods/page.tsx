import type { Metadata } from "next";
import { canonical, neighborhoodsIndexJsonLd, organizationJsonLd } from "@/lib/seo";
import { neighborhoodIndex } from "@/lib/neighborhoods";

export const metadata: Metadata = {
  title: "Neighborhoods — Bandra, Khar, Santacruz, Juhu & BKC | Chariot Realty",
  description:
    "Area guides for the micro-markets Chariot Realty covers in Mumbai: Bandra West, Bandra East, Khar West, Santacruz West, Juhu and BKC — price bands, transit, and verified listings.",
};

export default function NeighborhoodsIndexPage() {
  const site = canonical();
  const jsonLd = [...organizationJsonLd(), ...neighborhoodsIndexJsonLd()];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="page">
        <section className="section-head page-head">
          <h1>Mumbai Neighborhoods We Cover</h1>
          <p className="sub">
            Verified price bands, transit, and curated listings for the micro-markets Chariot Realty works across: Bandra
            West, Bandra East, Khar West, Santacruz West, Juhu and BKC.
          </p>
        </section>

        <section className="neighborhood-tiles">
          {neighborhoodIndex.map(({ slug, name }) => (
            <a key={slug} href={`/neighborhoods/${slug}`} className="card">
              <h2>{name}</h2>
              <span className="cta">Explore {name} →</span>
            </a>
          ))}
        </section>
      </main>
    </>
  );
}
