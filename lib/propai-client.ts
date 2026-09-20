type PropsResponse = { reply?: string; error?: string; message?: string; detail?: string };

function config() {
  return {
    baseUrl: (process.env.PROPAI_API_URL || "https://api.propai.live").replace(/\/$/, ""),
    token: process.env.PROPAI_INTERNAL_TOKEN || "",
    brokerId: process.env.CHARIOT_WHATSAPP_BROKER_ID || "phone-2e12a9961676",
    senderJid: process.env.CHARIOT_WHATSAPP_SELF_JID || "",
  };
}

export function propaiConfigured() {
  const { token, brokerId } = config();
  return Boolean(token && brokerId);
}

/**
 * Asks Kapil's PropAI agent anything using the internal self-chat endpoint.
 * Handles both NDJSON streaming and single-JSON replies.
 */
export async function askPropAIAnything(text: string): Promise<{ reply: string }> {
  const { baseUrl, token, brokerId, senderJid } = config();
  if (!token) throw new Error("PropAI agent access is not configured");
  if (!brokerId) throw new Error("PropAI broker is not configured");

  const response = await fetch(`${baseUrl}/api/internal/self-chat`, {
    method: "POST",
    headers: {
      Accept: "application/json, application/x-ndjson",
      "Content-Type": "application/json",
      "X-PropAI-Internal-Token": token,
    },
    body: JSON.stringify({ broker_id: brokerId, sender_jid: senderJid, text }),
    cache: "no-store",
  });

  const contentType = response.headers.get("content-type") || "";
  const body = await response.text();
  if (!response.ok) {
    let detail = `PropAI returned ${response.status}`;
    try { detail = (JSON.parse(body) as PropsResponse).detail || (JSON.parse(body) as PropsResponse).error || (JSON.parse(body) as PropsResponse).message || detail; } catch { /* keep status */ }
    throw new Error(detail);
  }

  if (contentType.includes("ndjson") || contentType.includes("jsonlines")) {
    const events = body.split("\n").filter(Boolean).map((line) => JSON.parse(line) as { event?: string; delta?: string; reply?: string; message?: string; error?: string });
    const error = events.find((event) => event.event === "error")?.error || events.find((event) => event.event === "error")?.message;
    if (error) throw new Error(error);
    const reply = (events.map((event) => event.delta || "").join("").trim() || events.find((event) => event.event === "done")?.reply || "").trim();
    if (!reply) throw new Error("PropAI returned no answer");
    return { reply };
  }

  const parsed = JSON.parse(body) as PropsResponse;
  if (parsed.error || parsed.message) throw new Error(parsed.error || parsed.message || "PropAI returned no answer");
  return { reply: parsed.reply || "PropAI returned no answer." };
}