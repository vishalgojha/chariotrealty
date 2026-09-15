type AgentResponse = { reply?: string; error?: string; message?: string };

const CHARIOT_AGENT_CONTEXT = `You are Kapil's Chariot Realty agent. PropAI is the intelligence and memory backend; Chariot Realty is the public publishing destination. Keep these actions separate: (1) search/read PropAI group evidence, (2) save inventory privately for Kapil, (3) share inventory to the PropAI marketplace, and (4) publish inventory to the Chariot Realty website. Never claim an item is on the Chariot website unless Chariot has explicitly confirmed the publish action. For a Chariot website request, collect the listing details and photos, show a concise preview, and ask Kapil to confirm with exactly: PUBLISH TO CHARIOT. Treat any other wording as a draft or private save. Remember Kapil's confirmed preferences and private inventory in the tenant workspace.`;

function config() {
  return {
    baseUrl: (process.env.PROPAI_API_URL || "https://api.propai.live").replace(/\/$/, ""),
    token: process.env.PROPAI_INTERNAL_TOKEN || "",
    brokerId: process.env.CHARIOT_WHATSAPP_BROKER_ID || "phone-2e12a9961676",
    senderJid: process.env.CHARIOT_WHATSAPP_SELF_JID || "",
  };
}

export async function askPropAIAgent(text: string) {
  const { baseUrl, token, brokerId, senderJid } = config();
  if (!token) throw new Error("PropAI agent access is not configured");

  const response = await fetch(`${baseUrl}/api/internal/self-chat`, {
    method: "POST",
    headers: {
      Accept: "application/json, application/x-ndjson",
      "Content-Type": "application/json",
      "X-PropAI-Internal-Token": token,
    },
    body: JSON.stringify({ broker_id: brokerId, sender_jid: senderJid, text: `${CHARIOT_AGENT_CONTEXT}\n\nKapil's request:\n${text}` }),
    cache: "no-store",
  });

  const contentType = response.headers.get("content-type") || "";
  const body = await response.text();
  if (!response.ok) {
    let detail = `PropAI agent returned ${response.status}`;
    try { detail = (JSON.parse(body) as AgentResponse).error || (JSON.parse(body) as AgentResponse).message || detail; } catch { /* keep status */ }
    throw new Error(detail);
  }

  if (contentType.includes("ndjson") || contentType.includes("jsonlines")) {
    const events = body.split("\n").filter(Boolean).map((line) => JSON.parse(line) as AgentResponse & { event?: string; delta?: string });
    const deltas = events.map((event) => event.delta || "").join("").trim();
    const reply = (deltas || events.find((event) => event.event === "done")?.reply || "").trim();
    const error = events.find((event) => event.event === "error")?.message;
    if (error) throw new Error(error);
    return { reply };
  }

  return JSON.parse(body) as AgentResponse;
}
