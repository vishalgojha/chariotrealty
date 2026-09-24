import type { Metadata } from "next";
import { canonical, organizationJsonLd, faqJsonLd } from "@/lib/seo";
import { neighborhoods } from "@/lib/neighborhoods";

const WA_TXT = `https://wa.me/919773757759?text=`;

export const metadata: Metadata = {
  title: "About | Chariot Realty",
  description:
    "Chariot Realty is a boutique Mumbai real-estate agency — verified prime rentals, corporate residences and direct developer mandates across Bandra, Khar, Santacruz, Juhu and BKC.",
};

export default function AboutPage() {
  const site = canonical();
  const allTestimonials = neighborhoods.flatMap((n) => n.testimonials ?? []);
  const faqs = [
    { q: "What areas does Chariot Realty cover?", a: "Bandra West & East, Khar West, Santacruz West, Juhu and BKC — the micro-markets we run live price-band and listing data for." },
    { q: "Is every listing verified?", a: "Yes — each published listing is checked for availability, configuration and price before it goes live, and possessions/ERAs are listed where RERA applies." },
    { q: "How do I see a property?", a: "Contact Kapil on WhatsApp (+91 97737 57759) with the configuration and budget — you get a verified shortlist the same day, no paid site visits." },
  ];
  const ld = [...organizationJsonLd(), faqJsonLd(`${site}/about#faq`, faqs)];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <main className="page">
        <section className="section-head page-head">
          <h1>About Chariot Realty</h1>
          <p className="sub">
            A boutique Bandra-based real-estate agency for prime rentals, corporate residences and direct developer
            mandates across Mumbai&apos;s western suburbs.
          </p>
        </section>

        <section className="about-body">
          <h2>Who we are</h2>
          <p>
            Chariot Realty (Chariot Real Estate), founded and led by principal broker Kapil Gopal Ojha, works a
            WhatsApp-first model: you speak directly to the broker, never a portal. We hold direct mandates from
            builders and verified corporate relocation inventory.
          </p>
          <h2>Our neighborhoods</h2>
          <p>
            Bandra West, Bandra East, Khar West, Santacruz West, Juhu and BKC — each with its own live price bands,
            transit routing and curated listings on this site.
          </p>
        </section>

        <section className="about-testimonials">
          <h2>What clients say</h2>
          {allTestimonials.slice(0, 6).map((t, i) => (
            <blockquote key={i} className="card">
              <p>&ldquo;{t.quote}&rdquo;</p>
              <footer>
                <cite>{t.name}</cite> — {t.area} <span className="tag">{t.type}</span>
              </footer>
            </blockquote>
          ))}
        </section>

        <section className="about-cta">
          <a className="btn-primary" href={`${WA_TXT}${encodeURIComponent("Hi Kapil, I'd like to know more about Chariot Realty.")}`}>
            Talk to Kapil on WhatsApp
          </a>
        </section>
      </main>
    </>
  );
}
