"use client";

import { useRouter } from "next/navigation";
import { ArrowLeftIcon, CheckIcon, InstagramIcon } from "@/components/icons";
import { ContactBar } from "@/components/contact-bar";
import { SiteHeader } from "@/components/site-header";
import { waLink, type Listing } from "@/lib/listing";
import { Breadcrumb } from "@/components/breadcrumb";
import { Gallery } from "@/components/gallery";
import { KeyFacts } from "@/components/key-facts";
import { AmenitiesGrid } from "@/components/amenities-grid";
import { EnquiryCard } from "@/components/enquiry-card";

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
        {listing.amenities.length ? <div className="similar-tags"><em>{listing.amenities.slice(0, 2).join(" • ")}</em></div> : null}
      </div>
    </a>
  );
}

export function ListingDetail({ listing, similar }: { listing: Listing; similar: Listing[] }) {
  const router = useRouter();

  const media = listing.media.map((m) => ({ url: m.url, type: m.type }));

  return (
    <>
      <div className="detail-desktop-header">
        <SiteHeader />
      </div>

      <div className="shell detail-shell">
        <div className="detail-brief-top">
          <button type="button" className="detail-back" aria-label="Back to listings" onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}>
            <ArrowLeftIcon size={16} />
          </button>
          <a className="detail-brand" href="/" aria-label="Chariot Realty home">
            <img src="/apple-touch-icon.png" alt="" />
          </a>
        </div>

        <Breadcrumb items={[
          { label: "Home", href: "/" },
          { label: "Properties", href: "/properties" },
          { label: listing.area || listing.location, href: `/properties?area=${encodeURIComponent(listing.area || listing.location)}` },
          { label: listing.name }
        ]} />

        <div className="detail-redesign-layout">
          <main className="detail-redesign-main">
            <Gallery media={media.length ? media : [{ url: "", type: "image" }]} name={listing.name} />

            <div className="detail-header-block">
              <h1><a href="/properties" className="detail-title-link">{listing.name}</a></h1>
              <div className="detail-price-row">
                <span className="detail-price">{listing.price}{listing.priceNote ? ` ${listing.priceNote}` : ""}</span>
              </div>
              <p className="detail-location-text">{listing.location}</p>
            </div>

            <KeyFacts listing={listing} />
            <AmenitiesGrid listing={listing} />

            {listing.description ? (
              <section className="detail-section">
                <div className="detail-section-head">
                  <h2>Description</h2>
                  <button
                    type="button"
                    className="pill pill-ghost pill-sm"
                    onClick={() => { navigator.clipboard.writeText(listing.description || ""); }}
                  >
                    Copy
                  </button>
                </div>
                <p>{listing.description}</p>
              </section>
            ) : null}

            {listing.projectDetails.length ? (
              <section className="detail-section">
                <h2>Project details</h2>
                <ul className="project-detail-list">
                  {listing.projectDetails.map((detail) => <li key={detail}>{detail}</li>)}
                </ul>
              </section>
            ) : null}

            <section className="detail-section detail-map">
              <h2>Location</h2>
              <iframe
                title={`Map of ${listing.name}`}
                src={`https://maps.google.com/maps?q=${encodeURIComponent(`${listing.name} ${listing.location}`)}&z=15&output=embed`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
                style={{ width: "100%", height: 320, border: 0, borderRadius: 12 }}
              />
            </section>

            {listing.mediaLinks.length ? (
              <div className="detail-media-link">
                {listing.mediaLinks.map((link) => <a key={link.href} className="pill pill-gold pill-sm" href={link.href} target="_blank" rel="noreferrer">
                  {link.label === "Instagram Reel" ? <InstagramIcon size={14} /> : null}{link.label}
                </a>)}
              </div>
            ) : null}
          </main>

          <aside>
            <EnquiryCard listing={listing} />
          </aside>
        </div>

        {similar.length ? <section className="similar-section">
          <h2>Similar Options</h2>
          <div className="similar-grid">{similar.map((candidate) => <SimilarCard key={candidate.slug} listing={candidate} />)}</div>
        </section> : null}
      </div>

      <ContactBar message={listing.waMessage} />
    </>
  );
}
