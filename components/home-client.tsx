"use client";

import { useEffect, useMemo, useState } from "react";
import { AboutUs } from "@/components/about-us";
import { CheckIcon, ChevronDownIcon, InstagramIcon, SearchIcon, ShareIcon, WhatsAppIcon } from "@/components/icons";
import { LeadModal, type LeadKind } from "@/components/lead-modal";
import { PropertyCard } from "@/components/property-card";
import type { Listing, ListingFilter, Category } from "@/lib/listing";
import { LISTING_FILTERS } from "@/lib/listing";
import { organizationJsonLd } from "@/lib/seo";
import { shareToWhatsApp, shareNative } from "@/lib/share";

const SCROLL_KEY = "chariot:listing-scroll";
const INSTAGRAM = "https://instagram.com/chariotrealty.in";

function waa(message: string) {
  return `https://wa.me/919773757759?text=${encodeURIComponent(message)}`;
}

function normalizeType(type: Category): Category {
  if (type === "commercial" || type === "residential" || type === "under-construction") return type;
  return "residential";
}

type HomeClientProps = { initialListings: Listing[] };

export function HomeClient({ initialListings }: HomeClientProps) {
  const [listings, setListings] = useState<Listing[]>(initialListings);
  const [filter, setFilter] = useState<ListingFilter>("all");
  const [query, setQuery] = useState("");

  const updateParams = (next: Partial<{ q: string; filter: ListingFilter }>) => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (next.q !== undefined) {
      if (next.q) params.set("q", next.q);
      else params.delete("q");
    }
    if (next.filter !== undefined) {
      if (next.filter && next.filter !== "all") params.set("filter", next.filter);
      else params.delete("filter");
    }
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, "", newUrl);
  };

  const setQueryWithUrl = (value: string) => {
    setQuery(value);
    updateParams({ q: value });
  };

  const setFilterWithUrl = (value: ListingFilter) => {
    setFilter(value);
    updateParams({ filter: value });
  };
  const [modal, setModal] = useState<LeadKind | null>(null);
  const [loaded, setLoaded] = useState(initialListings.length > 0);
  const [unavailable, setUnavailable] = useState(initialListings.length === 0);
  const [retryCount, setRetryCount] = useState(0);
  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set());

  useEffect(() => {
    const stored = window.sessionStorage.getItem(SCROLL_KEY);
    if (stored) {
      window.sessionStorage.removeItem(SCROLL_KEY);
      window.scrollTo(0, Number(stored) || 0);
    }
  }, []);

  // Sync URL params to state on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q") || "";
    const f = params.get("filter") as ListingFilter || "all";
    setQuery(q);
    setFilter(f);
  }, []);

  useEffect(() => {
    if (initialListings.length > 0) return;
    if (retryCount > 1) {
      setLoaded(true);
      setUnavailable(true);
      return;
    }
    let active = true;
    fetch("/api/properties")
      .then((response) => response.json())
      .then((data) => {
        if (!active) return;
        const list = Array.isArray(data?.data) ? data.data : Array.isArray(data?.listings) ? data.listings : [];
        if (list.length > 0) {
          setListings(list);
          setUnavailable(false);
        } else {
          setUnavailable(true);
          setRetryCount((c) => c + 1);
        }
        setLoaded(true);
      })
      .catch(() => {
        if (active) {
          setUnavailable(true);
          setRetryCount((c) => c + 1);
          setLoaded(true);
        }
      });
    return () => {
      active = false;
    };
  }, [initialListings, retryCount]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return listings.filter((l) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "buy" && !(l.price || "").toLowerCase().includes("/mo")) ||
        (filter === "rent" && (l.price || "").toLowerCase().includes("/mo")) ||
        (filter === "commercial" && l.category === "commercial") ||
        (filter === "under-construction" && l.category === "under-construction");
      if (!matchesFilter) return false;
      if (!q) return true;
      const hay = [l.name, l.location, l.slug, ...(l.amenities || [])].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [listings, filter, query]);

  const displayListings = useMemo(
    () => filtered.filter((listing) => listing.category !== "under-construction").slice(0, 12),
    [filtered],
  );

  const underConstructionListings = useMemo(
    () => filtered.filter((listing) => listing.category === "under-construction").slice(0, 12),
    [filtered],
  );

  const toggleSelect = (slug: string) => {
    setSelectedSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const shareSelected = async () => {
    const selected = filtered.filter((l) => selectedSlugs.has(l.slug));
    if (selected.length === 0) return;
    const shared = await shareNative(selected);
    if (!shared) {
      const url = shareToWhatsApp(selected);
      window.open(url, "_blank", "noopener,noreferrer");
    }
    setSelectedSlugs(new Set());
  };

  function openModal(kind: LeadKind) {
    setModal(kind);
  }

  return (
    <>
      <header className="topbar">
        <div className="shell topbar-inner">
          <a className="brand" href="/">
            <span className="brand-logo">
              <img src="/apple-touch-icon.png" alt="Chariot Realty" />
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
            <a href="#under-construction">Under Construction</a>
          </nav>
          <div className="topbar-actions">
            <a className="pill pill-dark pill-sm topbar-call" href="tel:+919773757759">
              <svg aria-hidden="true" width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              +91 97737 57759
            </a>
            <a className="pill pill-dark pill-sm" href={waa("Hi Kapil, I'd like to discuss a Mumbai property opportunity.")} target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp">
              <WhatsAppIcon size={15} /> WhatsApp
            </a>
          </div>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-bg" aria-hidden="true" />
          <div className="shell hero-inner">
            <div className="hero-content">
              <h1 className="hero-title">Prime Real Estate in Bandra &amp; BKC, Mumbai</h1>
              <p className="hero-sub">Boutique agency led by Kapil Gopal Ojha. Curated rentals, sales &amp; corporate mandates.</p>
              <div className="hero-ctas">
                <button type="button" className="btn btn-primary" onClick={() => openModal("requirement")}>
                  Post Your Requirement
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => openModal("listing")}>
                  List Your Property
                </button>
              </div>
            </div>
            <div className="hero-search">
              <form
                className="search hero-search-form"
                role="search"
                onSubmit={(e) => e.preventDefault()}
              >
                <SearchIcon size={16} />
                <input
                  type="search"
                  placeholder="Search by locality, BHK, project..."
                  aria-label="Search listings"
                  value={query}
                  onChange={(e) => setQueryWithUrl(e.target.value)}
                />
                <button type="submit" className="pill pill-gold pill-sm">
                  Search
                </button>
              </form>
            </div>
            <div className="hero-filters">
              {LISTING_FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  className={`pill ${filter === f.value ? "pill-dark" : "pill-ghost"} pill-sm`}
                  onClick={() => setFilterWithUrl(f.value)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="section-block section-alt" id="opportunities">
          <div className="shell">
            <div className="section-head">
              <div>
                <p className="kicker">Curated Inventory</p>
                <h2>Exclusive Properties</h2>
                <p className="sub">Featured listings across Bandra, BKC and nearby western suburbs.</p>
              </div>
            </div>
            {selectedSlugs.size > 0 && (
              <div className="selection-bar">
                <span>{selectedSlugs.size} selected</span>
                <div className="selection-actions">
                  <button type="button" className="pill pill-outline pill-sm" onClick={() => setSelectedSlugs(new Set())}>
                    Clear
                  </button>
                  <button type="button" className="pill pill-gold pill-sm" onClick={shareSelected}>
                    <ShareIcon size={14} /> Share Selected
                  </button>
                </div>
              </div>
            )}
            {!loaded ? (
              <div className="listing-grid listing-grid-lg">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="card skeleton-card" />
                ))}
              </div>
            ) : unavailable ? (
              <div className="empty-state">
                <p>Inventory is temporarily unavailable.</p>
                <p className="loc" style={{ marginTop: 8 }}>
                  If you need current options, message Kapil directly.
                </p>
                <a className="pill pill-dark" style={{ marginTop: 14 }} href={waa("Hi Kapil, please share current inventory for Bandra/BKC.")} target="_blank" rel="noreferrer">
                  <WhatsAppIcon size={16} /> Message Kapil for current inventory
                </a>
              </div>
            ) : displayListings.length === 0 ? (
              <div className="empty-state">
                <p>No listings match your filters.</p>
                <button type="button" className="pill pill-outline" style={{ marginTop: 10 }} onClick={() => { setQueryWithUrl(""); setFilterWithUrl("all"); }}>
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="property-grid">
                {displayListings.map((l) => (
                  <PropertyCard
                    key={l.slug}
                    listing={l}
                    selected={selectedSlugs.has(l.slug)}
                    onSelect={toggleSelect}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="section-block" id="under-construction">
          <div className="shell">
            <div className="section-head">
              <div>
                <p className="kicker">New Developments</p>
                <h2>Under Construction</h2>
                <p className="sub">A considered selection of new residences in Bandra and Juhu, with current availability and possession timelines.</p>
              </div>
            </div>
            {underConstructionListings.length ? (
              <div className="property-grid">
                {underConstructionListings.map((l) => (
                  <PropertyCard
                    key={l.slug}
                    listing={l}
                    selected={selectedSlugs.has(l.slug)}
                    onSelect={toggleSelect}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state compact-empty">
                <p>New projects are being curated. Message Kapil for the current launch shortlist.</p>
              </div>
            )}
          </div>
        </section>

        <section className="section-block">
          <div className="shell">
            <div className="section-head">
              <div>
                <p className="kicker">About Chariot Realty</p>
                <h2>About the agency</h2>
              </div>
            </div>
            <div className="about-grid">
              <div className="about-text">
                <AboutUs />
              </div>
              <div className="about-points">
                <div className="panel clean">
                  <ul className="checklist">
                    <li><strong>Direct mandates</strong> — verified inventory with full disclosure</li>
                    <li><strong>WhatsApp-first</strong> — quick responses for buyers &amp; tenants</li>
                    <li><strong>Bandra &amp; BKC focus</strong> — hyperlocal expertise</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section-block section-alt">
          <div className="shell">
            <div className="section-head">
              <div>
                <p className="kicker">Neighborhoods</p>
                <h2>Neighborhoods Served</h2>
                <p className="sub">Bandra, BKC and nearby western suburbs — curated for luxury buyers and corporate tenants.</p>
              </div>
            </div>
            <div className="neigh-grid">
              <a href="/neighborhoods/bandra-west" className="neigh-card">
                <h3>Bandra</h3>
                <p className="loc">Luxury apartments, rentals &amp; direct mandates</p>
              </a>
              <a href="/neighborhoods/bkc" className="neigh-card">
                <h3>BKC</h3>
                <p className="loc">Corporate offices, premium residences &amp; leasing</p>
              </a>
              <a href="/neighborhoods/khar-west" className="neigh-card">
                <h3>Khar West</h3>
                <p className="loc">Upscale homes with strong connectivity</p>
              </a>
              <a href="/neighborhoods/santacruz-west" className="neigh-card">
                <h3>Santacruz West</h3>
                <p className="loc">Residential &amp; mixed-use opportunities</p>
              </a>
            </div>
          </div>
        </section>

        <section className="section-block">
          <div className="shell">
            <div className="section-head">
              <div>
                <p className="kicker">Updates</p>
                <h2>Weekly Site Walkthroughs</h2>
                <p className="sub">Raw uncut tours, lobby reviews and off-market updates from Bandra &amp; BKC.</p>
              </div>
            </div>
            <div className="panel clean">
              <a className="pill pill-outline pill-sm" href={INSTAGRAM} target="_blank" rel="noreferrer">
                <InstagramIcon size={14} /> Follow @chariotrealty.in
              </a>
              <p className="loc" style={{ marginTop: 10 }}></p>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="shell footer-inner">
          <div className="brand">
            <span className="brand-logo">
              <img src="/apple-touch-icon.png" alt="Chariot Realty" />
            </span>
            <p>Chariot Realty<br />Bandra West · BKC · Bandra East · Khar · Santacruz</p>
          </div>
          <p>
            Kapil Gopal Ojha · +91 97737 57759<br />
            <a href={waa("Hi Kapil, I'd like to discuss a Mumbai property opportunity.")} target="_blank" rel="noreferrer">WhatsApp</a> · <a href={INSTAGRAM} target="_blank" rel="noreferrer">@chariotrealty.in</a>
          </p>
        </div>
      </footer>

      <div className="bottom-bar bottom-bar-mobile">
        <a className="pill pill-dark" href={waa("Hi Kapil, I'd like to discuss a Mumbai property opportunity.")} target="_blank" rel="noreferrer">
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }} />
    </>
  );
}
