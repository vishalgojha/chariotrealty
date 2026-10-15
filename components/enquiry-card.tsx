"use client";

import { PhoneIcon, WhatsAppIcon } from "./icons";
import { waLink, LISTING_CREDIT, type Listing } from "@/lib/listing";

export function EnquiryCard({ listing }: { listing: Listing }) {
  return (
    <aside className="enquiry-card">
      <div className="enquiry-head">
        <strong>Interested?</strong>
        <span>Connect directly with Kapil</span>
      </div>

      <div className="enquiry-price">
        <div className="enquiry-price-label">Asking price</div>
        <div className="enquiry-price-value">{listing.price}{listing.priceNote ? ` ${listing.priceNote}` : ""}</div>
      </div>

      <div className="enquiry-actions">
        <a
          className="pill pill-dark pill-block"
          href={waLink(listing.waMessage)}
          target="_blank"
          rel="noreferrer"
        >
          <WhatsAppIcon size={16} />
          WhatsApp
        </a>
        <a
          className="pill pill-outline pill-block"
          href={`tel:${LISTING_CREDIT.tel}`}
        >
          <PhoneIcon size={16} />
          Call
        </a>
      </div>

      <div className="enquiry-trust">
        Verified listing • End-to-end encrypted
      </div>
    </aside>
  );
}