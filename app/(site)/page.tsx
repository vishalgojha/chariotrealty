"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LeadModal, type LeadKind } from "@/components/lead-modal";
import { ContactBar } from "@/components/contact-bar";
import { ListingCard } from "@/components/listing-card";
import { ArrowRightIcon, ChevronDownIcon, InstagramIcon, SearchIcon, WhatsAppIcon } from "@/components/icons";
import {
  LISTING_FILTERS,
  matchesFilter,
  searchListings,
  toListing,
  waLink,
  type Listing,
  type ListingFilter,
} from "@/lib/listing";

const SCROLL_KEY = "chariot:listing-scroll";
const INSTAGRAM = "https://instagram.com/chariotrealty.in";

export default function Home() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [filter, setFilter] = useState<ListingFilter>("all");
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<LeadKind | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const featuredTouch = useRef<number | null>(null);

  useEffect(() => {
    const stored = window.sessionStorage.getItem(SCROLL_KEY);
    if (stored) {
      window.sessionStorage.removeItem(SCROLL_KEY);
      window.scrollTo(0, Number(stored) || 0);
    }

    let active = true;
    fetch("/api/properties")
      .then((response) => response.json())
      .then((payload) => {
        if (!active) return;
        if (payload.degraded) {
          setUnavailable(true);
          return;
        }
        const rows = Array.isArray(payload.data) ? payload.data : [];
        setListings(rows.map(toListing));
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const visible = useMemo(() => searchListings(listings.filter((listing) => matchesFilter(listing, filter)), query), [listings, filter, query]);
  const featured = visible[0] ?? listings[0];
  const featuredSlide = featured?.media[featuredIndex] ?? featured?.media[0];

  useEffect(() => {
    setFeaturedIndex(0);
  }, [featured?.slug]);

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
        {featured ? (
          <div
            className="featured"
            style={{ marginTop: 20, backgroundImage: featuredSlide ? `url('${featuredSlide.url}')` : undefined }}
            onTouchStart={(event) => { featuredTouch.current = event.touches[0].clientX; }}
            onTouchEnd={(event) => {
              if (featuredTouch.current === null) return;
              const delta = event.changedTouches[0].clientX - featuredTouch.current;
              featuredTouch.current = null;
              if (delta < -40) setFeaturedIndex((current) => Math.min(current + 1, featured.media.length - 1));
              if (delta > 40) setFeaturedIndex((current) => Math.max(current - 1, 0));
            }}
          >
            <span className="featured-shade" />
            <span className="badge-featured">Featured</span>
            {!featuredSlide ? <div className="featured-placeholder">Photos coming soon</div> : null}
            <div className="featured-copy">
              <h3>{featured.name}</h3>
              <p className="featured-sub">{featured.summary}</p>
              <div className="featured-cta">
                <a className="pill pill-white pill-sm" href={`/properties/${featured.slug}`}>
                  View <ArrowRightIcon size={13} />
                </a>
              </div>
            </div>
            {featured.media.length > 1 ? <div className="featured-dots" aria-label="Featured photos">{featured.media.map((slide, index) => <button type="button" aria-label={`Featured photo ${index + 1}`} key={slide.url} className={index === featuredIndex ? "active" : ""} onClick={(event) => { event.preventDefault(); setFeaturedIndex(index); }} />)}</div> : null}
          </div>
        ) : null}

        <section id="opportunities">
          <div className="section">
            <div className="section-head">
              <div>
                <h2>Current Opportunities</h2>
              </div>
            </div>
          </div>

          <div className="actions">
            <button type="button" className="pill pill-gold" onClick={() => setModal("requirement")}>
              Post your requirement
            </button>
            <button type="button" className="pill pill-outline" onClick={() => setModal("listing")}>
              List your property
            </button>
          </div>

          <form className="search" onSubmit={(event) => event.preventDefault()} role="search">
            <SearchIcon />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search 3 BHK, BKC…"
              aria-label="Search listings"
            />
            <button type="submit" className="pill pill-gold pill-sm">
              Search
            </button>
          </form>

          <div className="filterbar">
            <span className="select-chip">
              {LISTING_FILTERS.find((option) => option.value === filter)?.label}
              <ChevronDownIcon />
              <select value={filter} onChange={(event) => setFilter(event.target.value as ListingFilter)} aria-label="Filter listings">
                {LISTING_FILTERS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </span>
            <span className="count">
              {visible.length} {visible.length === 1 ? "listing" : "listings"}
            </span>
          </div>

          {visible.length ? (
            <div className="listing-grid">
              {visible.map((listing) => (
                <ListingCard key={listing.slug} listing={listing} />
              ))}
            </div>
          ) : (
            <p className="empty-state">
              {unavailable
                ? "Live inventory is temporarily unavailable. Message Kapil on WhatsApp for today's shortlist."
                : loaded
                  ? "No listings match that search right now — message Kapil and we will send a shortlist."
                  : "Loading live inventory…"}
            </p>
          )}

          {listings.length ? (
            <div className="view-all">
              <button type="button" className="pill pill-outline" onClick={resetFilters}>
                View all {listings.length} listings
              </button>
            </div>
          ) : null}

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
            ·{" "}
            <a href={INSTAGRAM} target="_blank" rel="noreferrer">
              @chariotrealty.in
            </a>
          </p>
        </footer>
      </main>

      <LeadModal kind={modal ?? "requirement"} open={modal !== null} onClose={() => setModal(null)} />
      <ContactBar />
    </>
  );
}
