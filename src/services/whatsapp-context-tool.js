import { saveConversation, getConversationHistory } from "./conversation-service.js";
import { resolveContact } from "./contact-service.js";
import { updateLeadPreferences } from "./lead-service.js";
import { getOwnerSessionState, touchSession } from "./session-service.js";
import { buildChariotAiContext } from "./chariot-context-service.js";
import { parseLeadPreferences } from "../utils/extractors.js";

export async function resolveContactContextTool(parameters = {}) {
  const phone =
    parameters.phone ||
    parameters.user_phone ||
    parameters.caller_id ||
    parameters.system__caller_id ||
    parameters.whatsapp_user_id;

  if (!phone) {
    throw new Error("resolve_contact_context requires phone or system__caller_id");
  }

  const message = parameters.message || parameters.user_message || "";
  const source = parameters.source || "direct";
  const name = parameters.name || parameters.user_name || null;

  const contact = await resolveContact({
    phone,
    name,
    source
  });

  if (message) {
    await saveConversation({
      phone: contact.phone,
      role: contact.role,
      message,
      sender: "user"
    });
  }

  let ownerSessionActive = false;
  if (contact.role === "owner") {
    const sessionState = await getOwnerSessionState(contact.phone);
    ownerSessionActive = sessionState.active;
    await touchSession(contact.phone, true);
  } else if (contact.role !== "system") {
    await touchSession(contact.phone, true);
  }

  if (contact.role === "lead" && message) {
    await updateLeadPreferences(contact.phone, {
      ...parseLeadPreferences(message),
      name: contact.name,
      source
    });
  }

  const history = (await getConversationHistory(contact.phone, 10)).reverse();
  const context = buildChariotAiContext({
    contact,
    history,
    source,
    ownerSessionActive
  });

  return {
    ok: true,
    should_activate_ai: contact.role !== "system",
    contact,
    context
  };
}
