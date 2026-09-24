import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { canonical, listingJsonLd } from "@/lib/seo";
import { listPublishedProperties } from "@/lib/inventory";

export const dynamic = "force-static";

const WA_NUMBER = "919773757759";

function waLink(message: string): string {
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`;
}

export async function generateStaticParams() {
  const all = await listPublishedProperties();
  return all.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const all = await listPublishedProperties();
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
  const all = await listPublishedProperties();
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
