import { getInventorySummary, saveListing, searchListings } from "./listing-service.js";
import { getLeads, updateLeadStatus } from "./lead-service.js";
import { scheduleSiteVisit } from "./visit-service.js";

export const toolHandlers = {
  search_listings: async (parameters = {}) => {
    return searchListings(parameters);
  },
  save_listing: async (parameters = {}) => {
    return saveListing(parameters);
  },
  get_leads: async (parameters = {}) => {
    return getLeads(parameters);
  },
  update_lead_status: async (parameters = {}) => {
    return updateLeadStatus(parameters.phone, parameters.status);
  },
  get_inventory_summary: async () => {
    return getInventorySummary();
  },
  schedule_site_visit: async (parameters = {}) => {
    return scheduleSiteVisit(parameters.lead_phone, parameters.datetime);
  }
};

export async function executeTool(toolName, parameters) {
  const handler = toolHandlers[toolName];
  if (!handler) {
    throw new Error(`Unknown tool requested: ${toolName}`);
  }

  return handler(parameters);
}
