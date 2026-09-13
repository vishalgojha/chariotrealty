import { Composio } from "@composio/core";

export type LeadAutomationInput = {
  leadId: string;
  name: string;
  phone: string;
  email?: string | null;
  intent: string;
  locality?: string | null;
  propertyId?: string | null;
  message?: string | null;
};

let client: Composio | null = null;

function getClient() {
  const apiKey = process.env.COMPOSIO_API_KEY;
  if (!apiKey) return null;
  client ??= new Composio({ apiKey, allowTracking: false });
  return client;
}

export async function runLeadAutomations(lead: LeadAutomationInput) {
  const composio = getClient();
  if (!composio || process.env.COMPOSIO_AUTOMATION_ENABLED !== "true") {
    return { enabled: false, results: [] };
  }

  const userId = process.env.COMPOSIO_USER_ID || "chariotrealty-owner";
  const ownerEmail = process.env.CHARIOT_OWNER_EMAIL;
  if (!ownerEmail) return { enabled: true, results: [{ action: "owner_email", status: "skipped", reason: "CHARIOT_OWNER_EMAIL is not configured" }] };

  const summary = [
    `New Mumbai ${lead.intent} enquiry`,
    `Name: ${lead.name}`,
    `Phone: ${lead.phone}`,
    lead.email ? `Email: ${lead.email}` : null,
    lead.locality ? `Locality: ${lead.locality}` : null,
    lead.propertyId ? `Property: ${lead.propertyId}` : null,
    lead.message ? `Message: ${lead.message}` : null,
    `Lead ID: ${lead.leadId}`,
  ].filter(Boolean).join("\n");

  try {
    const result = await composio.tools.execute("GMAIL_SEND_EMAIL", {
      userId,
      arguments: {
        recipient_email: ownerEmail,
        subject: `Mumbai lead · ${lead.locality || "Chariot Realty"} · ${lead.name}`,
        body: summary,
        is_html: false,
      },
    });
    return { enabled: true, results: [{ action: "owner_email", status: "sent", result }] };
  } catch (error) {
    console.error("Composio lead automation failed", error);
    return { enabled: true, results: [{ action: "owner_email", status: "failed" }] };
  }
}

export function composioStatus() {
  return {
    configured: Boolean(process.env.COMPOSIO_API_KEY),
    enabled: process.env.COMPOSIO_AUTOMATION_ENABLED === "true",
    ownerEmailConfigured: Boolean(process.env.CHARIOT_OWNER_EMAIL),
    workflows: ["GMAIL_SEND_EMAIL"],
  };
}
