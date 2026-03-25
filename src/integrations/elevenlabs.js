import WebSocket from "ws";
import { env, isElevenLabsConfigured } from "../config/env.js";
import { executeTool } from "../services/tool-service.js";
import { generateFallbackResponse } from "../services/fallback-ai.js";

function buildSystemPrompt({ contact, history, ownerSessionActive }) {
  const historyText = history.length
    ? history.map((item) => `${item.sender === "agent" ? "Agent" : "User"}: ${item.message}`).join("\n")
    : "No prior conversation history.";

  const promptParts = [
    "You are Chariot Realty's WhatsApp middleware-connected ElevenLabs agent for Mumbai real estate.",
    `You are speaking with ${contact.name || "Unknown"}, ${contact.role}.`,
    "Keep replies concise, practical, and WhatsApp-friendly.",
    "Use the provided client tools when inventory, lead data, summaries, or site visits are needed.",
    "System number 9137833547 is never a customer and must never be treated as a lead or broker.",
    contact.role === "lead"
      ? `Lead flow: qualify BHK, area, budget, and deal type. Source is ${contact.source || "direct"}. Use search_listings when enough information is available and offer site visit scheduling.`
      : "Lead flow: not applicable.",
    contact.role === "broker"
      ? "Broker flow: detect listing share intent, save listings with save_listing, and support co-broking queries against existing inventory."
      : "Broker flow: not applicable.",
    contact.role === "owner"
      ? `Owner flow: this is Kapil. Never qualify him as a lead. Only respond to his incoming messages. Owner session currently ${ownerSessionActive ? "active" : "starting with this message"}.`
      : "Owner flow: not applicable.",
    "Conversation history:",
    historyText
  ];

  return promptParts.join("\n");
}

async function getSignedUrl() {
  const response = await fetch(`https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${env.elevenLabsAgentId}`, {
    headers: {
      "xi-api-key": env.elevenLabsApiKey
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to get ElevenLabs signed URL: ${response.status} ${body}`);
  }

  const data = await response.json();
  return data.signed_url;
}

export async function generateAgentReply({ contact, message, history, ownerSessionActive }) {
  if (!isElevenLabsConfigured()) {
    return generateFallbackResponse({ contact, message, history });
  }

  try {
    return await generateViaWebSocket({ contact, message, history, ownerSessionActive });
  } catch (error) {
    console.error("[elevenlabs:error]", error);
    return generateFallbackResponse({ contact, message, history });
  }
}

async function generateViaWebSocket({ contact, message, history, ownerSessionActive }) {
  const signedUrl = await getSignedUrl();
  const prompt = buildSystemPrompt({ contact, history, ownerSessionActive });

  return new Promise((resolve, reject) => {
    const socket = new WebSocket(signedUrl);
    let settled = false;
    let responseText = "";

    const settle = (fn, value) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      try {
        socket.close();
      } catch {
        // Ignore close errors.
      }
      fn(value);
    };

    const timeout = setTimeout(() => {
      if (responseText.trim()) {
        settle(resolve, responseText.trim());
      } else {
        settle(reject, new Error("Timed out waiting for ElevenLabs response"));
      }
    }, 25000);

    socket.on("open", () => {
      socket.send(JSON.stringify({
        type: "conversation_initiation_client_data",
        conversation_config_override: {
          conversation: {
            text_only: true
          },
          agent: {
            prompt: {
              prompt
            }
          }
        },
        user_id: contact.phone,
        dynamic_variables: {
          user_name: contact.name || "Unknown",
          user_role: contact.role,
          user_phone: contact.phone
        }
      }));

      socket.send(JSON.stringify({
        type: "user_message",
        text: message
      }));
    });

    socket.on("message", async (raw) => {
      const data = JSON.parse(String(raw));

      if (data.type === "ping") {
        socket.send(JSON.stringify({
          type: "pong",
          event_id: data.ping_event?.event_id
        }));
        return;
      }

      if (data.type === "client_tool_call") {
        const toolName = data.client_tool_call?.tool_name;
        const parameters = data.client_tool_call?.parameters || {};
        const toolCallId = data.client_tool_call?.tool_call_id;

        try {
          const result = await executeTool(toolName, parameters);
          socket.send(JSON.stringify({
            type: "client_tool_result",
            tool_call_id: toolCallId,
            result,
            is_error: false
          }));
        } catch (error) {
          socket.send(JSON.stringify({
            type: "client_tool_result",
            tool_call_id: toolCallId,
            result: error.message,
            is_error: true
          }));
        }
        return;
      }

      if (data.type === "agent_chat_response_part") {
        const partType = data.text_response_part?.type;
        const text = data.text_response_part?.text || "";
        if (partType === "start" || partType === "delta") {
          responseText += text;
        }
        if (partType === "stop" && responseText.trim()) {
          settle(resolve, responseText.trim());
        }
        return;
      }

      if (data.type === "agent_response") {
        settle(resolve, data.agent_response_event?.agent_response || responseText.trim());
      }
    });

    socket.on("error", (error) => {
      settle(reject, error);
    });

    socket.on("close", () => {
      if (!settled && responseText.trim()) {
        settle(resolve, responseText.trim());
      }
    });
  });
}
