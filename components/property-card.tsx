import { CheckIcon, InstagramIcon } from "./icons";
import Image from "next/image";
import type { Listing } from "@/lib/listing";

export function PropertyCard({ listing, onSelect, selected }: { listing: Listing; onSelect?: (slug: string) => void; selected?: boolean }) {
  const image = listing.media[0]?.url;
  const specs = [listing.configuration, listing.carpetAreaSqft ? `${listing.carpetAreaSqft.toLocaleString("en-IN")} sqft` : null].filter(Boolean).join(" • ");

  return (
    <article className="property-card">
      <a className="property-card-link" href={`/properties/${listing.slug}`}>
        <div className={`property-card-media ${!image ? "placeholder" : ""}`}>
          {image && <Image src={image} alt={listing.name} fill className="property-card-img" unoptimized />}
          {listing.badge ? <span className={`property-badge ${listing.badgeTone}`}>{listing.badge}</span> : null}
          {onSelect && (
            <button
              className="property-select"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSelect(listing.slug); }}
              aria-pressed={selected}
            >
              <span className="select-box">{selected ? <CheckIcon size={14} /> : ""}</span>
            </button>
          )}
        </div>

        <div className="property-card-body">
          <div className="property-card-heading">
            <h3 className="property-card-title">{listing.name}</h3>
            <span className="property-card-arrow" aria-hidden="true">↗</span>
          </div>
          <p className="property-card-location">{listing.location}</p>
          <div className="property-card-price-chip">{listing.price}{listing.priceNote ? ` ${listing.priceNote}` : ""}</div>
          {specs && <div className="property-card-specs">{specs}</div>}
          {listing.amenities.length > 0 && (
            <div className="property-card-amenities">
              {listing.amenities.slice(0, 3).map(a => <span key={a}>{a}</span>)}
            </div>
          )}
        </div>
      </a>
      {listing.mediaLinks[0]?.href ? (
        <a
          className="property-card-media-link"
          href={listing.mediaLinks[0].href}
          target="_blank"
          rel="noreferrer"
          aria-label="Watch Instagram video"
        >
          <InstagramIcon size={13} /> Watch video
        </a>
      ) : null}
    </article>
  );
}
