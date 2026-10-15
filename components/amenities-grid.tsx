import type { Listing } from "@/lib/listing";
import { CheckIcon } from "./icons";

export function AmenitiesGrid({ listing }: { listing: Listing }) {
  const amenities = listing.amenities;
  if (!amenities.length) return null;

  return (
    <section className="amenities-grid">
      <h3>Amenities</h3>
      <div className="amenities-list">
        {amenities.map((amenity) => (
          <div key={amenity} className="amenity-item">
            <CheckIcon size={14} />
            <span>{amenity}</span>
          </div>
        ))}
      </div>
    </section>
  );
}