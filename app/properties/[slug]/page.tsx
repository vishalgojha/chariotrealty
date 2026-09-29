import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { canonical, listingJsonLd } from "@/lib/seo";
import { readInventory } from "@/lib/inventory";

// These pages must render per request. The build container has no database
// credentials, so a prerender would bake in either seed data or a permanent
// "unavailable" notice. Reading live at request time is what keeps the site
// honest about what is actually listed.
export const dynamic = "force-dynamic";

const WA_NUMBER = "919773757759";

function waLink(message: string): string {
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`;
}

// A database outage must not be reported as "this property does not exist".
// Returning notFound() here would tell search engines to drop every real
// listing during an incident, so the page says the site is unavailable instead.
function unavailable() {
  return (
    <main className="page">
      <section className="section-head page-head">
        <p className="kicker">Temporarily unavailable</p>
        <h1>We could not load our listings right now</h1>
        <p className="loc">Please refresh in a moment, or contact us directly and we will help straight away.</p>
        <p className="loc"><a href={`https://wa.me/${WA_NUMBER}`}>Message us on WhatsApp</a></p>
      </section>
    </main>
  );
}

// No generateStaticParams on purpose. The build container has no database
// credentials, so enumerating slugs here would either bake in the seed data or
// silently prerender nothing, depending on the day. Slugs come from the live
// inventory at request time instead.
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const { properties: all, degraded } = await readInventory();
  if (degraded) return { title: `Listings temporarily unavailable | Chariot Realty`, robots: { index: false, follow: true } };
  const p = all.find((x) => x.slug === params.slug);
  if (!p) return {};
  const site = canonical();
  return {
    title: `${p.name} — ${p.locality} | Chariot Realty`,
    description: p.description ?? `${p.name}, ${p.configuration ?? "residential"} in ${p.locality}, Mumbai — verified availability via Chariot Realty.`,
    alternates: { canonical: `${site}/properties/${p.slug}` },
  };
}

export default async function PropertyDetailPage({ params }: { params: { slug: string } }) {
  const { properties: all, degraded } = await readInventory();
  if (degraded) return unavailable();
  const p = all.find((x) => x.slug === params.slug);
  if (!p) notFound();
  const site = canonical();
  const ld = [...listingJsonLd(p)];
  const waMsg = `Hi Kapil, I'm interested in ${p.name} (${p.locality}, ${p.price}).`;
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <main className="page">
        <section className="section-head page-head">
          <p className="kicker">{p.locality}</p>
          <h1>{p.name}</h1>
          <p className="loc">{p.location}</p>
          <p className="price">{p.price}</p>
        </section>
        <section className="detail-specs">
          {p.configuration && <div><span>Configuration</span><strong>{p.configuration}</strong></div>}
          {p.carpetAreaSqft ? <div><span>Carpet</span><strong>{p.carpetAreaSqft.toLocaleString("en-IN")} sqft</strong></div> : null}
          {p.parking && <div><span>Parking</span><strong>{p.parking}</strong></div>}
          {p.possession && <div><span>Possession</span><strong>{p.possession}</strong></div>}
          <div><span>Status</span><strong>Verified · {p.status === "published" ? "Live" : "Draft"}</strong></div>
        </section>
        {p.description && <p className="detail-desc">{p.description}</p>}
        <div className="detail-cta">
          <a className="btn-primary" href={waLink(waMsg)}>Direct enquiry on WhatsApp</a>
        </div>
      </main>
    </>
  );
}
