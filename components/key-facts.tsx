import type { Listing } from "@/lib/listing";

function formatLabel(label: string) {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function KeyFacts({ listing }: { listing: Listing }) {
  const items: { label: string; value: string }[] = [];

  const config = listing.configuration ? /^\d+$/.test(listing.configuration) ? `${listing.configuration} BHK` : listing.configuration : undefined;
  if (config) items.push({ label: "Configuration", value: config });
  if (listing.carpetAreaSqft) items.push({ label: "Carpet Area", value: `${listing.carpetAreaSqft.toLocaleString("en-IN")} sqft` });
  if (listing.possession) items.push({ label: "Possession", value: listing.possession });
  else items.push({ label: "Status", value: "Ready to move" });

  if (listing.priceUnit === "monthly_rent") {
    items.push({ label: "Tenure", value: "Monthly" });
  }

  // Derived facts from listing facts array
  const seen = new Set(items.map(i => i.label.toLowerCase()));
  for (const f of listing.facts) {
    const label = formatLabel(f.label);
    const key = label.toLowerCase();
    if (!seen.has(key)) {
      items.push({ label, value: f.value });
      seen.add(key);
    }
  }

  const chipLabels = ["Furnishing", "Parking", "Balcony", "Servant Room Washroom", "RERA"];
  const chips = items.filter(i => chipLabels.includes(i.label));
  const amenityChips = listing.amenities?.slice(0, 6) ?? [];

  return (
    <section className="key-facts">
      <h3>Key facts</h3>
      <div className="key-facts-grid">
        {items.map((item) => (
          <div key={item.label} className="key-fact">
            <div className="key-fact-label">{item.label}</div>
            <div className="key-fact-value">{item.value}</div>
          </div>
        ))}
      </div>
      {(chips.length > 0 || amenityChips.length > 0) && (
        <div className="key-facts-chips">
          {chips.map(c => (
            <span key={c.label} className="pill pill-ghost pill-sm">{c.label}: {c.value}</span>
          ))}
          {amenityChips.map(a => (
            <span key={a} className="pill pill-ghost pill-sm">Amenity: {a}</span>
          ))}
        </div>
      )}
    </section>
  );
}