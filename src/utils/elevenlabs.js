export function extractInitiationPhone(payload = {}) {
  return (
    payload.phone ||
    payload.user_id ||
    payload.caller_id ||
    payload.from ||
    payload.contact?.phone ||
    payload.contact_phone ||
    payload.dynamic_variables?.user_phone ||
    payload.metadata?.phone ||
    ""
  );
}

export function extractInitiationName(payload = {}) {
  return (
    payload.name ||
    payload.contact?.name ||
    payload.contact_name ||
    payload.dynamic_variables?.user_name ||
    ""
  );
}

export function extractLeadSource(payload = {}) {
  return (
    payload.source ||
    payload.channel_source ||
    payload.metadata?.source ||
    payload.dynamic_variables?.lead_source ||
    "direct"
  );
}

export function formatHistoryForPrompt(history = []) {
  if (!history.length) {
    return "No prior history found in CRM.";
  }

  return history
    .map((item) => `${item.sender === "agent" ? "Agent" : "User"}: ${item.message}`)
    .join("\n")
    .slice(0, 4000);
}
