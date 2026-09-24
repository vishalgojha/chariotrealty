import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { canonical, neighborhoodJsonLd, faqJsonLd, listingJsonLd } from "@/lib/seo";
import { neighborhoods, neighborhoodIndex } from "@/lib/neighborhoods";
import { mumbaiNeighborhoodSlugs } from "@/lib/seo";
import { listPublishedProperties } from "@/lib/inventory";

export const dynamic = "force-static";

export function generateStaticParams() {
  return neighborhoodIndex.map(({ slug }) => ({ slug }));
}

type PageProps = { params: { slug: string } };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const n = neighborhoods.find((h) => h.slug === params.slug);
  if (!n) return {};
  const site = canonical();
  return {
    title: `${n.name} Real Estate — Rentals, Prices & Guide | Chariot Realty`,
    description: n.intro[0] ?? `${n.name} apartments, offices and price bands in Mumbai's western suburbs.`,
    alternates: { canonical: `${site}/neighborhoods/${n.slug}` },
    openGraph: {
      title: `${n.name} Real Estate`,
      description: n.intro[0] ?? "",
      url: `${site}/neighborhoods/${n.slug}`,
      images: n.image ? [{ url: n.image }] : undefined,
    },
  };
}

export default async function NeighborhoodPage({ params }: PageProps) {
  const n = neighborhoods.find((h) => h.slug === params.slug);
  if (!n) notFound();
  const site = canonical();
  const listings = (await listPublishedProperties()).filter((p) => n.listingFilters({ micro_market: p.microMarket ?? "", locality: p.locality ?? "", zone: p.zone ?? "Western Suburbs", location: p.location ?? p.locality }));
  const faqId = `${site}/neighborhoods/${n.slug}#faq`;
  const jsonLd = [
    ...neighborhoodJsonLd(n),
    faqJsonLd(faqId, n.faqs),
    ...listings.map((p) => listingJsonLd(p)),
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main id="neighborhood-top" className="page">
        <header className="neighborhood-hero">
          <h1>{n.name}</h1>
          <p className="zone">{n.zone}</p>
          <p className="intro">{n.intro.join(" ")}</p>
        </header>

        <section id="known-for" className="n-card">
          <h2>Known for</h2>
          <ul className="tags">
            {n.knownFor.map((k) => (
              <li key={k}>{k}</li>
            ))}
          </ul>
        </section>

        <section id="who-lives" className="n-card">
          <h2>Who lives here</h2>
          <p>{n.whoLivesHere}</p>
        </section>

        <section id="price-bands" className="n-card">
          <h2>Price bands (updated {n.updated})</h2>
          <div className="price-table">
            {n.priceBands.map((pb) => (
              <div key={pb.configuration} className="price-row">
                <strong>{pb.configuration}</strong>
                <span>{pb.lowCr} – {pb.highCr}</span>
                <small>{pb.typicalCr} typical · {pb.when}</small>
              </div>
            ))}
          </div>
          <p className="source-note">{n.sourceNote}</p>
        </section>

        <section id="transit" className="n-card">
          <h2>Getting around</h2>
          <p>{n.transitSummary}</p>
          <ul>
            {n.transit.map((t) => (
              <li key={t.label}>
                {t.label}{t.minutesToGateway ? ` — ${t.minutesToGateway} min to Bandra Gateway` : ""}
              </li>
            ))}
          </ul>
          <p className="transit-distances">
            Gateway {n.distance.toGateway} · Airport {n.distance.toAirport} · Station {n.distance.toStation}
          </p>
        </section>

        <section id="listings" className="n-card">
          <h2>Live inventory</h2>
          {listings.length ? (
            <div className="grid">
              {listings.map((p) => (
                <a key={p.slug} href={`/properties/${p.slug}`} className="card">
                  <h3>{p.name}</h3>
                  <p className="loc">{p.location}</p>
                  <p className="price">{p.price}</p>
                  <p className="spec">{p.configuration ?? ""} {p.carpetAreaSqft ? `· ${p.carpetAreaSqft} sqft` : ""}</p>
                </a>
              ))}
            </div>
          ) : (
            <p className="empty">No verified {n.name} listings live right now — message Kapil on WhatsApp for the current shortlist.</p>
          )}
          <a className="btn-primary" href={`https://wa.me/919773757759?text=${encodeURIComponent(`Hi Kapil, looking for options in ${n.name}.`)}`}>
            Ask about {n.name}
          </a>
        </section>

        <section id="faq" className="n-card">
          <h2>FAQ</h2>
          {n.faqs.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </section>

        <section id="testimonials" className="n-card">
          <h2>What residents say</h2>
          {n.testimonials.map((t) => (
            <blockquote key={t.name}>
              <p>“{t.quote}”</p>
              <footer>
                <cite>{t.name}</cite> — {t.area} · {t.type}
              </footer>
            </blockquote>
          ))}
        </section>
      </main>
    </>
  );
}
