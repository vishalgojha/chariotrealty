"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, CheckIcon, InstagramIcon, PhoneIcon, WhatsAppIcon } from "@/components/icons";
import { ContactBar } from "@/components/contact-bar";
import { SiteHeader } from "@/components/site-header";
import { LISTING_CREDIT, PHONE_DISPLAY, PHONE_TEL, waLink, type Listing } from "@/lib/listing";

function SimilarCard({ listing }: { listing: Listing }) {
  const cover = listing.media[0];
  return (
    <a className="similar-card" href={`/properties/${listing.slug}`}>
      <div className="similar-media" style={cover ? { backgroundImage: `url('${cover.url}')` } : undefined}>
        {!cover ? <div className="listing-placeholder"><img src="/apple-touch-icon.png" alt="" /><span>Photos coming soon</span></div> : null}
        <span className="similar-badge"><CheckIcon size={10} /> Verified</span>
      </div>
      <div className="similar-body">
        <strong>{listing.configuration || listing.name}</strong>
        <span>{listing.location}</span>
        <b>{listing.price}{listing.priceNote ? ` ${listing.priceNote}` : ""}</b>
        {listing.amenities.length ? <div className="similar-tags">{listing.amenities.slice(0, 2).map((amenity) => <em key={amenity}>{amenity}</em>)}</div> : null}
      </div>
    </a>
  );
}

export function ListingDetail({ listing, similar }: { listing: Listing; similar: Listing[] }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const touchStart = useRef<number | null>(null);
  const slides = listing.media;
  const last = Math.max(slides.length - 1, 0);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") setIndex((current) => Math.min(current + 1, last));
      if (event.key === "ArrowLeft") setIndex((current) => Math.max(current - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [last]);

  return (
    <>
      <div className="detail-desktop-header">
        <SiteHeader />
      </div>

      <div className="detail-brief-top">
        <button type="button" className="detail-back" aria-label="Back to listings" onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}>
          <ArrowLeftIcon size={16} />
        </button>
        <a className="detail-brand" href="/" aria-label="Chariot Realty home">
          <img src="/apple-touch-icon.png" alt="" />
        </a>
        <a className="pill pill-dark pill-sm detail-brief-wa" href={waLink(listing.waMessage)} target="_blank" rel="noreferrer">
          <WhatsAppIcon size={14} /> WhatsApp
        </a>
      </div>

      {/* One column on a phone, gallery beside the facts on a desktop. */}
      <div className="detail-layout">
        <div className="detail-main">
          <div
            className="detail-gallery"
            onTouchStart={(event) => { touchStart.current = event.touches[0].clientX; }}
            onTouchEnd={(event) => {
              if (touchStart.current === null) return;
              const delta = event.changedTouches[0].clientX - touchStart.current;
              touchStart.current = null;
              if (delta < -40) setIndex((current) => Math.min(current + 1, last));
              if (delta > 40) setIndex((current) => Math.max(current - 1, 0));
            }}
          >
            <div className="detail-gallery-track" style={{ transform: `translateX(-${index * 100}%)` }}>
              {slides.length ? slides.map((slide) => slide.type === "video" ? (
                <video key={slide.url} className="detail-gallery-slide" src={slide.url} muted loop playsInline controls />
              ) : (
                <div key={slide.url} className="detail-gallery-slide" style={{ backgroundImage: `url('${slide.url}')` }} />
              )) : (
                <div className="detail-gallery-slide detail-gallery-empty">Photos shared on WhatsApp</div>
              )}
            </div>
            <span className="detail-verified"><CheckIcon size={11} /> Verified</span>
            {listing.area ? <span className="detail-location">{listing.area}</span> : null}
          </div>
          <div className="detail-dots">
            {(slides.length ? slides : [{ url: "empty", type: "image" as const }]).map((slide, dot) => <button type="button" aria-label={`Photo ${dot + 1}`} key={slide.url} className={dot === index ? "active" : ""} onClick={() => setIndex(dot)} />)}
          </div>
        </div>

        <div className="detail-aside">
          <section className="detail-title-block">
            <h1>{listing.name}</h1>
            <p className="detail-brief-price">{listing.price}{listing.priceNote ? <span>{listing.priceNote}</span> : null}</p>
            {listing.specsLine ? <p className="detail-specs-line">{listing.specsLine}</p> : null}
          </section>

          {listing.amenities.length ? <div className="detail-amenities">{listing.amenities.map((amenity) => <span key={amenity}>{amenity}</span>)}</div> : null}

          {listing.description ? (
            <section className="detail-section detail-description-box">
              <div className="detail-section-heading"><h2>Description</h2><span>Verified listing data</span></div>
              <p>{listing.description}</p>
            </section>
          ) : null}

          {listing.mediaLinks.length ? (
            <div className="detail-media-link">
              {listing.mediaLinks.map((link) => <a key={link.href} className="pill pill-gold pill-sm" href={link.href} target="_blank" rel="noreferrer">
                {link.label === "Instagram Reel" ? <InstagramIcon size={14} /> : null}{link.label}
              </a>)}
            </div>
          ) : null}

          <div className="detail-listing-credit">
            <p className="detail-credit-label">Listed by</p>
            <p className="detail-credit-name">
              <a href={`tel:${LISTING_CREDIT.tel}`}>{LISTING_CREDIT.name}</a>
              <span>{LISTING_CREDIT.role}</span>
            </p>
            <p className="detail-credit-phone">
              <a href={`tel:${LISTING_CREDIT.tel}`}>{LISTING_CREDIT.phone}</a>
              <a href={LISTING_CREDIT.whatsapp} target="_blank" rel="noreferrer">WhatsApp</a>
            </p>
          </div>
        </div>
      </div>

      {similar.length ? <section className="similar-section">
        <h2>Similar Options</h2>
        <div className="similar-grid">{similar.map((candidate) => <SimilarCard key={candidate.slug} listing={candidate} />)}</div>
      </section> : null}

      <ContactBar message={listing.waMessage} />
    </>
  );
}
