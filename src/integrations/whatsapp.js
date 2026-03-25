import { env, isWhatsAppConfigured } from "../config/env.js";
import { detectLeadSource } from "../utils/extractors.js";
import { normalizePhone } from "../utils/phone.js";

export async function sendWhatsAppText(to, body) {
  if (!isWhatsAppConfigured()) {
    console.log("[whatsapp:dry-run]", { to, body });
    return { ok: true, dryRun: true };
  }

  const normalizedPhone = normalizePhone(to);
  const response = await fetch(`https://graph.facebook.com/v22.0/${env.whatsappPhoneId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.whatsappToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: normalizedPhone.length === 10 ? `91${normalizedPhone}` : normalizedPhone,
      type: "text",
      text: {
        body
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`WhatsApp send failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

export function parseWhatsAppPayload(body) {
  const messages = [];

  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value || {};
      const contacts = value.contacts || [];
      const profileName = contacts[0]?.profile?.name || null;

      for (const message of value.messages || []) {
        if (message.type !== "text") {
          continue;
        }

        messages.push({
          phone: message.from,
          profileName,
          text: message.text?.body || "",
          timestamp: message.timestamp ? new Date(Number(message.timestamp) * 1000).toISOString() : new Date().toISOString(),
          source: detectLeadSource({
            source: body.source,
            referral: message.referral,
            raw: message
          }),
          raw: message
        });
      }
    }
  }

  if (!messages.length && body.from && body.text) {
    messages.push({
      phone: body.from,
      profileName: body.name || null,
      text: body.text,
      timestamp: body.timestamp || new Date().toISOString(),
      source: detectLeadSource(body),
      raw: body
    });
  }

  return messages;
}
