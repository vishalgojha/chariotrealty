import { CheckIcon, InstagramIcon } from "@/components/icons";
import { waLink, type Listing } from "@/lib/listing";

export function ListingCard({ listing, reelUrl }: { listing: Listing; reelUrl?: string }) {
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
        <p className="loc">{listing.location}</p>
        <p className="listing-price">
          {listing.price}
          {listing.priceNote ? <span>{listing.priceNote}</span> : null}
        </p>
        <div className="rule" />
        <div className="listing-foot">
          {reelUrl ? (
            <a className="pill pill-ghost pill-sm" href={reelUrl} target="_blank" rel="noreferrer">
              <InstagramIcon size={14} /> Instagram Reel
            </a>
          ) : (
            <a className="pill pill-ghost pill-sm" href={waLink(listing.waMessage)} target="_blank" rel="noreferrer">
              Ask Kapil about this
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
