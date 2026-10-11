"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { AboutUs } from "@/components/about-us";
import { ChevronDownIcon, InstagramIcon, SearchIcon, WhatsAppIcon } from "@/components/icons";
import { LeadModal, type LeadKind } from "@/components/lead-modal";
import { ListingCard, type ListingCardProps } from "@/components/listing-card";
import type {
  Listing,
  ListingFilter,
  Category,
} from "@/lib/listing";
import { organizationJsonLd } from "@/lib/seo";

const SCROLL_KEY = "chariot:listing-scroll";
const INSTAGRAM = "https://instagram.com/chariotrealty.in";

function waLink(message: string) {
  return `https://wa.me/919773757759?text=${encodeURIComponent(message)}`;
}

function normalizeType(type: Category): Category {
  if (type === "commercial" || type === "residential" || type === "under-construction") {
    return type;
  }
  return "residential";
}

type HomeClientProps = {
  initialListings: Listing[];
};

export function HomeClient({ initialListings }: HomeClientProps) {
  const [listings, setListings] = useState<Listing[]>(initialListings);
  const [filter, setFilter] = useState<ListingFilter>("all");
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<LeadKind | null>(null);
  const [loaded, setLoaded] = useState(initialListings.length > 0);
  const [unavailable, setUnavailable] = useState(initialListings.length === 0);

  useEffect(() => {
    const stored = window.sessionStorage.getItem(SCROLL_KEY);
    if (stored) {
      window.sessionStorage.removeItem(SCROLL_KEY);
      window.scrollTo(0, Number(stored) || 0);
    }
  }, []);

  useEffect(() => {
    if (initialListings.length > 0) return;
    let active = true;
    fetch("/api/properties")
      .then((response) => response.json())
      .then((data) => {
        if (!active) return;
        if (Array.isArray(data?.listings)) {
          setListings(data.listings);
          setUnavailable(false);
        } else {
          setUnavailable(true);
        }
        setLoaded(true);
      })
      .catch(() => {
        if (active) {
          setUnavailable(true);
          setLoaded(true);
        }
      });
    return () => {
      active = false;
    };
  }, [initialListings]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return listings.filter((l) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "buy" && (l.price ? !/mo/i.test(l.price) : true)) ||
        (filter === "rent" && (/mo/i.test(l.price||""))) ||
        (filter === "commercial" && l.category === "commercial") ||
        (filter === "under-construction" && l.category === "under-construction");
      if (!matchesFilter) return false;
      if (!q) return true;
      const hay = [
        l.name,
        l.location,
        
        
        l.slug,
        
        ...(l.amenities || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [listings, filter, query]);

  const cards: ListingCardProps[] = useMemo(
    () =>
      filtered.map((l) => ({
        slug: l.slug,
        title: l.name,
        location: l.location,
        microLocation: undefined,
        priceLabel: l.price,
        bedsLabel: l.configuration,
        areaLabel: l.area,
        propertyType: normalizeType(l.category),
        listingType: (/mo/i.test(l.price||"")) ? "rent" : "buy",
        imageUrl: l.media?.[0]?.url,
        availability: undefined,
        verified: l.badgeTone==="verified",
        featured: false,
      })),
    [filtered],
  );

  function openModal(kind: LeadKind) {
    setModal(kind);
  }

  function resetFilters() {
    setFilter("all");
    setQuery("");
  }

  return (
    <>
      <header className="topbar">
        <div className="shell topbar-inner">
          <a className="brand" href="/">
            <span className="brand-logo">
              <img src="/apple-touch-icon.png" alt="" />
            </span>
            <span className="brand-text">
              <span className="brand-name">
                Chariot <span>Realty</span>
              </span>
              <span className="brand-sub">Bandra · BKC</span>
            </span>
          </a>

          <nav className="topnav" aria-label="Sections">
            <a href="#opportunities">Residential</a>
            <a href="#opportunities">Commercial</a>
            <a href="#opportunities">Under Construction</a>
          </nav>

          <a className="pill pill-dark pill-sm" href={waLink("Hi Kapil, I'd like to discuss a Mumbai property opportunity.")} target="_blank" rel="noreferrer">
            <WhatsAppIcon size={15} /> WhatsApp
          </a>
        </div>
      </header>

      <main className="shell public-shell home-shell" id="top">
        <section id="opportunities">
          <div className="section">
            <div className="section-head">
              <div>
                <h2>Exclusive Properties</h2>
              </div>
            </div>
          </div>

          <div className="actions">
            <button type="button" className="pill pill-gold" onClick={() => openModal("requirement")}>
              Post your requirement
            </button>
            <button type="button" className="pill pill-outline" onClick={() => openModal("listing")}>
              List your property
            </button>
          </div>

          <form
            className="search"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
            }}
          >
            <SearchIcon size={16} />
            <input
              type="search"
              placeholder="Search 3 BHK, BKC…"
              aria-label="Search listings"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button type="submit" className="pill pill-gold pill-sm">
              Search
            </button>
          </form>

          <div className="filterbar">
            <span className="select-chip">
              {filter === "all" && "All listings"}
              {filter === "buy" && "For Sale"}
              {filter === "rent" && "For Rent"}
              {filter === "commercial" && "Commercial"}
              {filter === "under-construction" && "Under Construction"}
              <ChevronDownIcon size={14} />
              <select aria-label="Filter listings" value={filter} onChange={(e) => setFilter(e.target.value as ListingFilter)}>
                <option value="all">All listings</option>
                <option value="buy">For Sale</option>
                <option value="rent">For Rent</option>
                <option value="commercial">Commercial</option>
                <option value="under-construction">Under Construction</option>
              </select>
            </span>

            {!loaded ? (
              <span className="count skeleton skeleton-text" style={{ width: 120 }} />
            ) : (
              <span className="count">
                {filtered.length} {filtered.length === 1 ? "listing" : "listings"}
              </span>
            )}
          </div>

          {!loaded ? (
            <>
              <div className="listing-grid">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="card skeleton-card" />
                ))}
              </div>
            </>
          ) : unavailable ? (
            <p className="empty-state">Inventory is temporarily unavailable. Please try again in a moment.</p>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <p>No listings match your filters.</p>
              <button type="button" className="pill pill-outline" onClick={resetFilters}>
                Clear filters
              </button>
            </div>
          ) : (
            <div className="listing-grid">
              {cards.map((c) => (
                <ListingCard
                  key={c.slug}
                  {...c}
                  onClick={(slug) => {
                    window.sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
                    window.location.href = `/properties/${slug}`;
                  }}
                />
              ))}
            </div>
          )}

          <AboutUs />

          <div className="panel" style={{ marginTop: 26 }}>
            <h4>Weekly site walkthroughs</h4>
            <p className="loc" style={{ marginBottom: 14 }}>
              Raw uncut tours, lobby reviews and off-market updates from Bandra &amp; BKC.
            </p>
            <a className="pill pill-outline pill-sm" href={INSTAGRAM} target="_blank" rel="noreferrer">
              <InstagramIcon size={14} /> Follow @chariotrealty.in
            </a>
          </div>
        </section>

        <footer className="site-footer">
          <div className="brand">
            <span className="brand-logo">
              <img src="/apple-touch-icon.png" alt="" />
            </span>
            <p>
              Chariot Realty
              <br />
              Bandra West · BKC · Bandra East · Khar · Santacruz
            </p>
          </div>
          <p>
            Kapil Gopal Ojha · +91 97737 57759
            <br />
            <a href={waLink("Hi Kapil, I'd like to discuss a Mumbai property opportunity.")} target="_blank" rel="noreferrer">
              WhatsApp
            </a>{" "}
            · <a href={INSTAGRAM} target="_blank" rel="noreferrer">@chariotrealty.in</a>
          </p>
        </footer>
      </main>

      <div className="bottom-bar">
        <a className="pill pill-dark" href={waLink("Hi Kapil, I'd like to discuss a Mumbai property opportunity.")} target="_blank" rel="noreferrer">
          <WhatsAppIcon size={16} /> WhatsApp
        </a>
        <a className="pill pill-outline" href="tel:+919773757759">
          <svg aria-hidden="true" width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
          CALL +91 97737 57759
        </a>
      </div>

      <LeadModal open={modal!==null} kind={modal||"requirement"} onClose={() => setModal(null)} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
      />
    </>
  );
}
