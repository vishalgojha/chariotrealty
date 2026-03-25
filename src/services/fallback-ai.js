import { getInventory, getInventorySummary, searchListings } from "./listing-service.js";
import { getLeads } from "./lead-service.js";
import { parseLeadPreferences } from "../utils/extractors.js";
import { formatCurrency } from "../utils/format.js";

function formatListing(listing) {
  return `${listing.building_name} ${listing.bhk || ""}BHK ${listing.area || ""} ${formatCurrency(listing.price)}`.trim();
}

export async function generateFallbackResponse({ contact, message }) {
  if (contact.role === "owner") {
    const value = String(message || "").toLowerCase();
    if (value.includes("show leads today")) {
      const leads = await getLeads({ period: "today", limit: 20 });
      return leads.length
        ? `Today's leads: ${leads.map((lead) => `${lead.name || lead.phone} (${lead.phone})`).join(", ")}`
        : "No new leads have been created today yet.";
    }

    if (value.includes("how many inquiries this week")) {
      const leads = await getLeads({ period: "week", limit: 500 });
      return `This week you have ${leads.length} new lead inquiries.`;
    }

    if (value.includes("show broker listings")) {
      const inventory = await getInventory({ added_by: "broker", limit: 10 });
      return inventory.length
        ? `Broker listings: ${inventory.map((listing) => `${listing.building_name} ${listing.bhk || ""}BHK by ${listing.added_by}`).join(" | ")}`
        : "No broker-added listings found.";
    }

    const summary = await getInventorySummary();
    return `Inventory has ${summary.total_listings || 0} listings. You can ask for leads, broker listings, inquiries, or add a listing.`;
  }

  if (contact.role === "broker") {
    return "Listing details received. Share building name, BHK, area, price, and deal type and I can save it to inventory.";
  }

  const preferences = parseLeadPreferences(message);
  if (preferences.bhk || preferences.area || preferences.budget || preferences.deal_type) {
    const matches = await searchListings({
      bhk: preferences.bhk,
      area: preferences.area,
      budget: preferences.budget,
      deal_type: preferences.deal_type,
      limit: 3
    });

    if (matches.length) {
      return `I found ${matches.length} options: ${matches.map(formatListing).join(" | ")}. If you'd like, I can help schedule a site visit.`;
    }
  }

  return "Thanks for reaching out to Chariot Realty. Please share your preferred BHK, area, budget, and whether you're looking to buy or rent.";
}
