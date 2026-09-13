"use client";

import { useEffect, useState } from "react";

type Category = "residential" | "commercial" | "under-construction";

type Property = {
  category: Category;
  name: string;
  location: string;
  price: string;
  priceNote?: string;
  image?: string;
  tag: string;
  locale: string;
  specs: [string, string][];
  links: { label: string; href: string; icon: "folder" | "instagram" }[];
  cta: string;
  message: string;
};

const whatsapp = "https://wa.me/919773757759";

const properties: Property[] = [
  {
    category: "residential",
    name: "Ten BKC",
    location: "Kalanagar, Bandra East · High Floor",
    price: "₹2.80L",
    priceNote: "/ mo",
    image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80",
    tag: "Verified",
    locale: "BKC / Kalanagar",
    specs: [["Config", "3 BHK"], ["Carpet", "1,100 sqft"], ["Parking", "2 Covered"]],
    links: [
      { label: "Watch Reel", href: "https://www.instagram.com/reel/PLACEHOLDER_TEN_BKC/", icon: "instagram" },
      { label: "Drive Photos", href: "https://drive.google.com/PLACEHOLDER_TEN_BKC_ALBUM", icon: "folder" },
    ],
    cta: "Contact Kapil on WhatsApp",
    message: "Hi Kapil, I'm interested in Ten BKC.",
  },
  {
    category: "commercial",
    name: "Godrej BKC",
    location: "G-Block BKC · Financial District",
    price: "₹285",
    priceNote: "/ sqft",
    tag: "Grade-A Office",
    locale: "",
    specs: [["Carpet", "4,200 sqft"], ["Condition", "Warm Shell"], ["Parking", "6 Reserved"]],
    links: [{ label: "Layout Plan PDF", href: "https://drive.google.com/PLACEHOLDER_GODREJ_LAYOUT", icon: "folder" }],
    cta: "Contact Kapil on WhatsApp",
    message: "Hi Kapil, send term sheet for Godrej BKC.",
  },
  {
    category: "under-construction",
    name: "Rustomjee Cleon",
    location: "Bandra East · RERA Approved",
    price: "From ₹4.25 Cr",
    tag: "Possession Q4 2026",
    locale: "Kalanagar",
    image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
    specs: [["Typology", "2 & 3 BHK"], ["Carpet", "685 - 1,020"], ["Payment", "CLP Scheme"]],
    links: [
      { label: "Brochure", href: "https://drive.google.com/PLACEHOLDER_CLEON_BROCHURE", icon: "folder" },
      { label: "Site Reel", href: "https://www.instagram.com/reel/PLACEHOLDER_CLEON_SITE/", icon: "instagram" },
    ],
    cta: "Contact Kapil on WhatsApp",
    message: "Hi Kapil, send cost sheet for Rustomjee Cleon.",
  },
];

function InstagramIcon({ size = 14 }: { size?: number }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>;
}

function FolderIcon() {
  return <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>;
}

function PropertyCard({ property }: { property: Property }) {
  const message = encodeURIComponent(property.message);
  return (
    <article className="card">
      <div className={`card-media ${property.image ? "" : "private"}`} style={property.image ? { backgroundImage: `url('${property.image}')` } : undefined}>
        <span className={`tag ${property.category === "under-construction" ? "green" : ""}`}>{property.tag}</span>
        {property.locale && <span className="tag locale">{property.locale}</span>}
        {!property.image && <p className="private-note">Bare Shell / Fitted options available</p>}
      </div>
      <div className="card-body">
        <h3>{property.name}</h3>
        <p className="loc">{property.location}</p>
        <p className="price">{property.price} {property.priceNote && <span>{property.priceNote}</span>}</p>
        <div className="specs">
          {property.specs.map(([key, value]) => <div key={key}><p className="spec-key">{key}</p><p className="spec-value">{value}</p></div>)}
        </div>
        <div className="media-links">
          {property.links.map((link) => <a key={link.label} href={link.href} target="_blank" rel="noreferrer" className="media-link-btn">{link.icon === "folder" ? <FolderIcon /> : <InstagramIcon size={12} />}{link.label}</a>)}
        </div>
        <a href={`${whatsapp}?text=${message}`} className="card-cta">{property.cta}</a>
      </div>
    </article>
  );
}

export default function Home() {
  const [activeCategory, setActiveCategory] = useState<"all" | Category>("all");
  const [liveStats, setLiveStats] = useState({ listings: 0, hubs: 0 });
  const visibleProperties = activeCategory === "all" ? properties : properties.filter((property) => property.category === activeCategory);

  useEffect(() => {
    Promise.all([fetch("/api/properties").then((response) => response.json()), fetch("/api/markets").then((response) => response.json())])
      .then(([propertyData, marketData]) => setLiveStats({ listings: propertyData.count ?? propertyData.data?.length ?? 0, hubs: marketData.data?.length ?? 0 }))
      .catch(() => setLiveStats({ listings: properties.length, hubs: 0 }));
  }, []);

  return (
    <>
      <nav>
        <a className="logo" href="#top">Chariot <span>Realty</span></a>
        <div className="nav-links"><a href="#inventory">Residential</a><a href="#inventory">Commercial</a><a href="#inventory">Under Construction</a></div>
        <div className="nav-actions"><a href="https://instagram.com/chariotreealty.in" target="_blank" rel="noreferrer" className="nav-insta"><InstagramIcon />@chariotreealty.in</a><a href={`${whatsapp}?text=${encodeURIComponent("Hi Kapil, I'd like to discuss a Mumbai property opportunity.")}`} className="nav-cta">WhatsApp Kapil</a></div>
      </nav>

      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <p className="kicker">Bandra West · BKC · Bandra East</p>
            <h1>Homes &amp; offices for people who don&apos;t have time to <em>search</em>.</h1>
            <p className="sub">Verified prime rentals, corporate workspaces, and direct developer mandates across Bandra and BKC.</p>
            <div className="hero-actions"><a href="#inventory" className="btn-primary">View Inventory</a><a href={whatsapp} className="btn-secondary">Talk to Kapil</a></div>
            <div className="hero-stats"><div><p className="stat-number">{liveStats.listings || "—"}</p><p className="stat-label">Live Listings</p></div><div><p className="stat-number">{liveStats.hubs || "—"}</p><p className="stat-label">Prime Hubs</p></div><div><p className="stat-number">1</p><p className="stat-label">Direct Contact</p></div></div>
          </div>
          <div className="hero-media" aria-label="Modern Bandra residence" />
        </section>

        <section className="section" id="inventory">
          <div className="section-head"><h2>Current Opportunities</h2></div>
          <div className="filter-strip" role="tablist" aria-label="Property categories">
            {(["all", "residential", "commercial", "under-construction"] as const).map((category) => <button key={category} type="button" role="tab" aria-selected={activeCategory === category} className={`filter-btn ${activeCategory === category ? "active" : ""}`} onClick={() => setActiveCategory(category)}>{category === "under-construction" ? "Under Construction" : category[0].toUpperCase() + category.slice(1)}</button>)}
          </div>
          <div className="grid">{visibleProperties.map((property) => <PropertyCard key={property.name} property={property} />)}</div>
          <div className="insta-strip"><div className="insta-left"><div className="insta-icon-box"><InstagramIcon size={22} /></div><div><h4>Watch Our Weekly Site Walkthroughs</h4><p>Raw uncut tours, lobby reviews, and off-market updates directly from Bandra &amp; BKC.</p></div></div><a href="https://instagram.com/chariotreealty.in" target="_blank" rel="noreferrer" className="insta-btn">Follow @chariotreealty.in →</a></div>
        </section>
      </main>

      <footer><div className="f-left"><a className="logo" href="#top">Chariot <span>Realty</span></a><p>Bandra West · BKC · Bandra East · Khar · Santacruz</p></div><div className="f-right"><p>Kapil Gopal Ojha · +91 97737 57759</p><p><a href={`${whatsapp}?text=${encodeURIComponent("Hi Kapil, I'd like to discuss a Mumbai property opportunity.")}`}>WhatsApp</a> · <a href="https://instagram.com/chariotreealty.in" target="_blank" rel="noreferrer">@chariotreealty.in</a></p></div></footer>
    </>
  );
}
