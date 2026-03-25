import { saveConversation, getConversationHistory } from "./conversation-service.js";
import { resolveContact } from "./contact-service.js";
import { updateLeadPreferences, upsertLead } from "./lead-service.js";
import { saveListing } from "./listing-service.js";
import { getOwnerSessionState, touchSession } from "./session-service.js";
import { tryHandleOwnerCommand } from "./owner-commands.js";
import { buildChariotAiContext } from "./chariot-context-service.js";
import { detectListingIntent, parseLeadPreferences, parseListingText } from "../utils/extractors.js";
import { formatCurrency } from "../utils/format.js";

export async function processInboundWebhook({ phone, name, message, source = "direct", timestamp }) {
  if (!phone || !message) {
    throw new Error("phone and message are required");
  }

  const contact = await resolveContact({
    phone,
    name,
    source
  });

  await saveConversation({
    phone: contact.phone,
    role: contact.role,
    message,
    sender: "user",
    timestamp
  });

  if (contact.role === "system") {
    return {
      ok: true,
      route: "system",
      should_activate_ai: false,
      response: null,
      reason: "system_number_logged_only"
    };
  }

  if (contact.role === "lead") {
    const preferences = parseLeadPreferences(message);
    await updateLeadPreferences(contact.phone, {
      ...preferences,
      name: contact.name,
      source
    });
  }

  let ownerSessionActive = false;
  if (contact.role === "owner") {
    const sessionState = await getOwnerSessionState(contact.phone);
    ownerSessionActive = sessionState.active;
    await touchSession(contact.phone, true);

    const shortcutResponse = await tryHandleOwnerCommand(message, contact.phone);
    if (shortcutResponse) {
      await saveConversation({
        phone: contact.phone,
        role: contact.role,
        message: shortcutResponse,
        sender: "agent"
      });

      return {
        ok: true,
        route: "owner",
        should_activate_ai: false,
        response: shortcutResponse,
        action: "owner_shortcut"
      };
    }
  } else {
    await touchSession(contact.phone, true);
  }

  if (contact.role === "broker" && detectListingIntent(message)) {
    const listing = parseListingText(message);
    if (listing) {
      const saved = await saveListing({
        ...listing,
        added_by: contact.phone
      });

      const response = `Listing added - ${saved.building_name} ${saved.bhk}BHK ${formatCurrency(saved.price)}`;
      await saveConversation({
        phone: contact.phone,
        role: contact.role,
        message: response,
        sender: "agent"
      });

      return {
        ok: true,
        route: "broker",
        should_activate_ai: false,
        response,
        action: "broker_listing_saved",
        data: saved
      };
    }
  }

  const history = (await getConversationHistory(contact.phone, 10)).reverse();
  const aiContext = buildChariotAiContext({
    contact,
    history,
    source,
    ownerSessionActive
  });

  return {
    ok: true,
    route: contact.role,
    should_activate_ai: true,
    response: null,
    ai_context: aiContext
  };
}

export async function saveLeadRecord(body) {
  return upsertLead(body);
}
