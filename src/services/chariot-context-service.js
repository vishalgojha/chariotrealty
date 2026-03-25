import { env } from "../config/env.js";

export function buildChariotAiContext({ contact, history, source = "direct", ownerSessionActive = false }) {
  const crmHistory = history.length
    ? history.map((item) => `${item.sender === "agent" ? "Agent" : "User"}: ${item.message}`).join("\n")
    : "No prior CRM history found.";

  const companyContext = [
    "Company: Chariot Realty",
    "Market focus: premium residential properties",
    "Priority areas: Bandra, BKC, Bandra East, South Mumbai",
    "Owner: Kapil Ojha",
    "Never describe Kapil as a lead.",
    "System numbers are logged only and must never activate AI."
  ].join("\n");

  const roleInstructions = {
    lead: "Lead flow: qualify BHK, area, budget, and deal_type; search premium listings; offer site visits when appropriate.",
    broker: "Broker flow: parse and save shared listings, confirm addition, and support co-broking inventory queries.",
    owner: "Owner flow: Kapil has full control, session-based activation, and can ask for leads, listings, and inquiry summaries.",
    system: "System flow: log only, never activate AI."
  };

  return {
    company: "Chariot Realty",
    dynamic_variables: {
      user_name: contact.name || "Unknown",
      role: contact.role,
      user_role: contact.role,
      user_phone: contact.phone,
      lead_source: source,
      owner_name: "Kapil Ojha",
      owner_phone: env.kapilPhone,
      owner_session_active: ownerSessionActive,
      focus_areas: "Bandra, BKC, Bandra East, South Mumbai",
      crm_history: crmHistory
    },
    instructions: [companyContext, roleInstructions[contact.role] || ""].filter(Boolean).join("\n"),
    tools: [
      "search_listings",
      "save_listing",
      "get_leads",
      "update_lead_status",
      "get_inventory_summary",
      "schedule_site_visit"
    ]
  };
}
