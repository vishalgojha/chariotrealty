import { env, isElevenLabsConfigured } from "../config/env.js";
import { saveConversation } from "./conversation-service.js";

export async function getConversationDetails(conversationId) {
  if (!isElevenLabsConfigured()) {
    throw new Error("ElevenLabs is not configured. Set ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID.");
  }

  const response = await fetch(`https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`, {
    headers: {
      "xi-api-key": env.elevenLabsApiKey
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to fetch ElevenLabs conversation: ${response.status} ${body}`);
  }

  return response.json();
}

export async function syncConversationTranscript({ conversationId, phone, role = "lead" }) {
  const details = await getConversationDetails(conversationId);
  const resolvedPhone =
    phone ||
    details.user_id ||
    details.conversation_initiation_client_data?.dynamic_variables?.user_phone ||
    details.conversation_initiation_client_data?.user_id;

  if (!resolvedPhone) {
    throw new Error("Conversation transcript sync needs a phone number or user_id.");
  }

  const transcript = details.transcript || [];
  for (const entry of transcript) {
    await saveConversation({
      phone: resolvedPhone,
      role,
      message: entry.message || "",
      sender: entry.role === "agent" ? "agent" : "user"
    });
  }

  return {
    ok: true,
    conversation_id: conversationId,
    phone: resolvedPhone,
    messages_synced: transcript.length
  };
}
