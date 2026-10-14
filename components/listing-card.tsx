import { ArrowRightIcon, CheckIcon, ShareIcon } from "@/components/icons";
import type { Category as ListingType, Listing } from "@/lib/listing";
import { shareToWhatsApp, copyShareLink } from "@/lib/share";

export type ListingCardProps = {
  slug: string;
  title: string;
  location?: string | null;
  microLocation?: string | null;
  priceLabel?: string | null;
  bedsLabel?: string | null;
  areaLabel?: string | null;
  propertyType?: ListingType;
  listingType?: "buy" | "rent";
  imageUrl?: string | null;
  availability?: string | null;
  verified?: boolean;
  featured?: boolean;
  // For sharing
  fullListing?: Listing;
  // For multi-select
  selected?: boolean;
  onSelect?: (slug: string) => void;
};

export function ListingCard(props: ListingCardProps & { onClick?: (slug: string) => void }) {
  const {
    slug,
    title,
    location,
    microLocation,
    priceLabel,
    bedsLabel,
    areaLabel,
    imageUrl,
    availability,
    verified,
    featured,
    fullListing,
    selected,
    onSelect,
    onClick,
  } = props;

  const name = title;
  const price = priceLabel || "";
  const loc = [microLocation, location].filter(Boolean).join(", ");
  const cover = imageUrl ? { url: imageUrl } : null;

  return (
    <article className="listing">
      <a
        className="listing-link"
        href={`/properties/${slug}`}
        onClick={(e) => {
          if (onClick) {
            e.preventDefault();
            window.sessionStorage.setItem("chariot:listing-scroll", String(window.scrollY));
            onClick(slug);
          } else {
            window.sessionStorage.setItem("chariot:listing-scroll", String(window.scrollY));
          }
        }}
      >
        <span className="sr-only">{`${name}, ${price}`}</span>
      </a>

      <div
        className="listing-media"
        style={cover ? { backgroundImage: `url('${cover.url}')` } : undefined}
      >
        {featured ? <span className="badge">Featured</span> : null}
        {availability ? <span className="availability">{availability}</span> : null}
        {onSelect && (
          <label className="listing-select" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSelect(slug); }}>
            <input type="checkbox" checked={selected} onChange={(e) => { e.preventDefault(); e.stopPropagation(); onSelect(slug); }} />
            <span className="checkmark"><CheckIcon size={18} /></span>
          </label>
        )}
      </div>

      <div className="listing-body">
        <h3 className="listing-title">{name}</h3>
        <p className="listing-price">{price}</p>
        <div className="rule" />
        <div className="listing-foot">
          {loc ? <span className="listing-loc">{loc}</span> : null}
          {bedsLabel ? <span className="listing-meta">{bedsLabel}</span> : null}
          {areaLabel ? <span className="listing-meta">{areaLabel}</span> : null}
          {verified ? <span className="listing-verified">Verified</span> : null}
          {fullListing && (
            <button
              className="listing-share"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const url = shareToWhatsApp([fullListing]);
                window.open(url, "_blank", "noopener,noreferrer");
              }}
              aria-label="Share this listing"
            >
              <ShareIcon size={14} />
            </button>
          )}
          <span className="listing-go">
            <ArrowRightIcon size={12} />
          </span>
        </div>
      </div>
    </article>
  );
}
