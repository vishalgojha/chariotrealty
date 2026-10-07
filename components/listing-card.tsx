import { CheckIcon, InstagramIcon } from "@/components/icons";
import { type Listing } from "@/lib/listing";

export function ListingCard({ listing }: { listing: Listing }) {
  const cover = listing.media[0];

  return (
    <article className="listing">
      <a
        className="listing-link"
        href={`/properties/${listing.slug}`}
        onClick={() => window.sessionStorage.setItem("chariot:listing-scroll", String(window.scrollY))}
      >
        <span className="sr-only">{`${listing.name}, ${listing.price}`}</span>
      </a>

      <div
        className="listing-media"
        style={cover ? { backgroundImage: `url('${cover.url}')` } : undefined}
      >
        {!cover ? <div className="listing-placeholder"><img src="/apple-touch-icon.png" alt="" /><span>Photos coming soon</span></div> : null}
        {cover?.type === "video" ? (
          <video src={cover.url} muted loop playsInline className="carousel-slide" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        ) : null}
        <span className={`listing-badge ${listing.badgeTone === "neutral" ? "neutral" : ""}`}>
          {listing.badgeTone === "verified" ? <CheckIcon /> : null}
          {listing.badge}
        </span>
        {listing.area ? <span className="listing-loc">{listing.area}</span> : null}
      </div>

      <div className="listing-body">
        <h3 className="listing-title">{listing.name}</h3>
        <p className="listing-price">
          {listing.price}
          {listing.priceNote ? <span>{listing.priceNote}</span> : null}
        </p>
        <div className="rule" />
        <div className="listing-foot">
          {listing.mediaLinks.length ? <a className="pill pill-ghost pill-sm" href={listing.mediaLinks[0].href} target="_blank" rel="noreferrer">
            {listing.mediaLinks[0].label === "Instagram Reel" ? <InstagramIcon size={14} /> : null}{listing.mediaLinks[0].label}
          </a> : null}
        </div>
      </div>
    </article>
  );
}
