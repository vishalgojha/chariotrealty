import { env } from "../config/env.js";
import { generateAgentReply } from "../integrations/elevenlabs.js";
import { sendWhatsAppText } from "../integrations/whatsapp.js";
import { saveConversation, getConversationHistory } from "./conversation-service.js";
import { resolveContact } from "./contact-service.js";
import { updateLeadPreferences } from "./lead-service.js";
import { saveListing } from "./listing-service.js";
import { getOwnerSessionState, touchSession } from "./session-service.js";
import { tryHandleOwnerCommand } from "./owner-commands.js";
import { detectListingIntent, parseLeadPreferences, parseListingText } from "../utils/extractors.js";
import { formatCurrency } from "../utils/format.js";
import { normalizePhone } from "../utils/phone.js";

export async function routeIncomingMessage({ phone, profileName, text, timestamp, source }) {
  const contact = await resolveContact({
    phone,
    name: profileName,
    source
  });

  if (contact.role === "system") {
    await saveConversation({
      phone: contact.phone,
      role: "system",
      message: text,
      sender: "user",
      timestamp
    });

    return {
      contact,
      reply: null,
      source: "system_event"
    };
  }

  await saveConversation({
    phone: contact.phone,
    role: contact.role,
    message: text,
    sender: "user",
    timestamp
  });

  if (contact.role === "lead") {
    const preferences = parseLeadPreferences(text);
    await updateLeadPreferences(contact.phone, {
      ...preferences,
      name: contact.name,
      source
    });
  }

  if (contact.role === "owner") {
    const sessionState = await getOwnerSessionState(contact.phone);
    await touchSession(contact.phone, true);

    const ownerReply = await tryHandleOwnerCommand(text, contact.phone);
    if (ownerReply) {
      await finalizeResponse(contact, ownerReply);
      return { contact, reply: ownerReply, source: "owner_command" };
    }

    const history = (await getConversationHistory(contact.phone, 10)).reverse();
    const reply = await generateAgentReply({
      contact,
      message: text,
      history,
      ownerSessionActive: sessionState.active
    });

    await finalizeResponse(contact, reply);
    return { contact, reply, source: "owner_agent" };
  }

  await touchSession(contact.phone, true);

  if (contact.role === "broker" && detectListingIntent(text)) {
    const parsedListing = parseListingText(text);
    if (parsedListing) {
      const saved = await saveListing({
        ...parsedListing,
        added_by: contact.phone
      });
      const reply = `Listing added - ${saved.building_name} ${saved.bhk}BHK ${formatCurrency(saved.price)}`;
      await finalizeResponse(contact, reply);
      return { contact, reply, source: "broker_listing" };
    }
  }

  const history = (await getConversationHistory(contact.phone, 10)).reverse();
  const reply = await generateAgentReply({
    contact: {
      ...contact,
      source
    },
    message: text,
    history,
    ownerSessionActive: false
  });

  await finalizeResponse(contact, reply);
  return { contact, reply, source: `${contact.role}_agent` };
}

async function finalizeResponse(contact, reply) {
  if (!reply) {
    return;
  }

  if (normalizePhone(contact.phone) === normalizePhone(env.systemNumber)) {
    return;
  }

  await saveConversation({
    phone: contact.phone,
    role: contact.role,
    message: reply,
    sender: "agent"
  });

  await sendWhatsAppText(contact.phone, reply);
}
