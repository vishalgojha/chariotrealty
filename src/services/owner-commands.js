import { saveListing, getInventory } from "./listing-service.js";
import { getLeads } from "./lead-service.js";
import { parseListingText } from "../utils/extractors.js";
import { formatCurrency } from "../utils/format.js";

export async function tryHandleOwnerCommand(message, phone) {
  const text = String(message || "").trim();
  const lower = text.toLowerCase();

  if (lower.includes("show leads today")) {
    const leads = await getLeads({ period: "today", limit: 25 });
    return leads.length
      ? `Today's leads: ${leads.map((lead) => `${lead.name || "Unknown"} (${lead.phone})`).join(", ")}`
      : "No new leads today yet.";
  }

  if (lower.includes("how many inquiries this week")) {
    const leads = await getLeads({ period: "week", limit: 500 });
    return `There have been ${leads.length} new lead inquiries this week.`;
  }

  if (lower.includes("show broker listings")) {
    const listings = await getInventory({ added_by: "broker", limit: 10 });
    return listings.length
      ? `Broker listings: ${listings.map((listing) => `${listing.building_name} ${listing.bhk || ""}BHK (${formatCurrency(listing.price)})`).join(" | ")}`
      : "No broker listings found.";
  }

  if (lower.startsWith("add listing")) {
    const parsed = parseListingText(text);
    if (!parsed) {
      return "I could not parse that listing. Try: Add listing - Ten BKC 3BHK ₹8.13Cr 1800 sqft.";
    }

    const saved = await saveListing({
      ...parsed,
      added_by: phone
    });
    return `Listing added - ${saved.building_name} ${saved.bhk}BHK ${formatCurrency(saved.price)}`;
  }

  return null;
}
