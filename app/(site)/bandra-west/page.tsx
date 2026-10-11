import { Metadata } from "next";
import { WhatsAppIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "bandra-west Real Estate | Chariot Realty",
  description: "Premium real estate in bandra-west with curated listings for luxury buyers and corporate tenants. WhatsApp +91 97737 57759.",
  alternates: { canonical: "https://chariotrealty.in/bandra-west" },
  openGraph: {
    title: "bandra-west Real Estate | Chariot Realty",
    description: "Curated luxury homes, rentals & corporate spaces in bandra-west.",
    url: "https://chariotrealty.in/bandra-west",
    images: [{ url: "/apple-touch-icon.png", width: 180, height: 180, alt: "Chariot Realty" }],
  },
  twitter: {
    card: "summary",
    title: "bandra-west Real Estate | Chariot Realty",
    description: "Curated luxury homes, rentals & corporate spaces in bandra-west.",
    images: ["/apple-touch-icon.png"],
  },
};

export default function Page() {
  const wa = "https://wa.me/919773757759?text=Hi%20Kapil%2C%20I%27d%20like%20to%20discuss%20property%20options%20in%20bandra%20west.";
  return (
    <main className="shell public-shell" style={{ paddingTop: 20 }}>
      <section style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: "clamp(1.8rem,4vw,2.4rem)", fontWeight: 700, marginBottom: 12 }}>
          bandra-west Real Estate
        </h1>
        <p style={{ color: "var(--muted)", lineHeight: 1.6, maxWidth: 760 }}>
          Chariot Realty curates luxury homes, premium rentals, and corporate spaces in bandra-west with verified inventory and direct mandates for luxury buyers and corporate tenants.
        </p>
      </section>
      <section className="panel" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: 10 }}>For Luxury Buyers &amp; Corporate Tenants</h2>
        <p style={{ color: "var(--muted)", lineHeight: 1.6, marginBottom: 14 }}>
          Tailored solutions for HNIs, expats, and corporates seeking premium spaces across bandra-west.
        </p>
        <a className="pill pill-dark" href={wa} target="_blank" rel="noreferrer">
          <WhatsAppIcon size={16} className="mr-2" /> WhatsApp +91 97737 57759
        </a>
      </section>
      <section className="panel">
        <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Why bandra-west?</h3>
        <ul style={{ color: "var(--muted)", paddingLeft: 18, lineHeight: 1.8 }}>
          <li>Premium inventory with direct developer access</li>
          <li>Strong connectivity &amp; infrastructure</li>
          <li>High rental yield potential</li>
          <li>Verified listings &amp; end-to-end support</li>
        </ul>
      </section>
    </main>
  );
}
