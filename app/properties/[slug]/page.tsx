import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { canonical, listingJsonLd } from "@/lib/seo";
import { readInventory } from "@/lib/inventory";
import { ListingDetail } from "@/components/listing-detail";
import { listingDescription, toListing, waLink } from "@/lib/listing";

// These pages must render per request. The build container has no database
// credentials, so a prerender would bake in either seed data or a permanent
// "unavailable" notice. Reading live at request time is what keeps the site
// honest about what is actually listed.
export const dynamic = "force-dynamic";

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
        <p className="loc"><a href={waLink("Hi Kapil, I could not load your website just now.")}>Message us on WhatsApp</a></p>
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
    description: listingDescription(p),
    alternates: { canonical: `${site}/properties/${p.slug}` },
  };
}

export default async function PropertyDetailPage({ params }: { params: { slug: string } }) {
  const { properties: all, degraded } = await readInventory();
  if (degraded) return unavailable();
  const p = all.find((x) => x.slug === params.slug);
  if (!p) notFound();
  const ld = [...listingJsonLd(p)];
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <main className="shell detail-shell page">
        <ListingDetail listing={toListing(p)} similar={all.filter((candidate) => candidate.slug !== p.slug).map(toListing).slice(0, 2)} />
      </main>
    </>
  );
}
