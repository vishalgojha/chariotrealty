import type { Listing } from "@/lib/listing";

function formatLabel(label: string) {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function KeyFacts({ listing }: { listing: Listing }) {
  const items: { label: string; value: string }[] = [];

  if (listing.configuration) items.push({ label: "Configuration", value: listing.configuration });
  if (listing.carpetAreaSqft) items.push({ label: "Carpet Area", value: `${listing.carpetAreaSqft.toLocaleString("en-IN")} sqft` });
  if (listing.possession) items.push({ label: "Possession", value: listing.possession });
  else items.push({ label: "Status", value: "Ready to move" });

  if (listing.priceUnit === "monthly_rent") {
    items.push({ label: "Tenure", value: "Monthly" });
  }

  // Derived facts from listing facts array
  for (const f of listing.facts) {
    const exists = items.find(i => i.label.toLowerCase() === f.label.toLowerCase());
    if (!exists) items.push({ label: formatLabel(f.label), value: f.value });
  }

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
    </section>
  );
}