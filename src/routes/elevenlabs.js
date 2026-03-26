import { Router } from "express";
import { env } from "../config/env.js";
import { elevenLabsAuth } from "../middleware/elevenlabs-auth.js";
import { getConversationHistory } from "../services/conversation-service.js";
import { buildChariotAiContext } from "../services/chariot-context-service.js";
import { syncConversationTranscript } from "../services/elevenlabs-service.js";
import { ingestElevenLabsWebhook } from "../services/elevenlabs-webhook-service.js";
import { resolveContact } from "../services/contact-service.js";
import { getOwnerSessionState, touchSession } from "../services/session-service.js";
import { executeTool } from "../services/tool-service.js";
import { extractInitiationName, extractInitiationPhone, extractLeadSource } from "../utils/elevenlabs.js";

export const elevenLabsRouter = Router();

elevenLabsRouter.use(elevenLabsAuth);

elevenLabsRouter.get("/manifest", (_req, res) => {
  res.json({
    transport_mode: "propai_live_chariot_middleware",
    conversation_init_url: "/elevenlabs/conversation-init",
    client_data_webhook_url: "/elevenlabs/client-data",
    transcript_sync_url: "/elevenlabs/conversations/sync",
    post_call_webhook_url: "/elevenlabs/post-call",
    tools: {
      resolve_contact_context: {
        method: "POST",
        url: "/elevenlabs/tools/resolve_contact_context"
      },
      search_listings: {
        method: "POST",
        url: "/elevenlabs/tools/search_listings"
      },
      save_listing: {
        method: "POST",
        url: "/elevenlabs/tools/save_listing"
      },
      get_leads: {
        method: "POST",
        url: "/elevenlabs/tools/get_leads"
      },
      update_lead_status: {
        method: "POST",
        url: "/elevenlabs/tools/update_lead_status"
      },
      get_inventory_summary: {
        method: "POST",
        url: "/elevenlabs/tools/get_inventory_summary"
      },
      schedule_site_visit: {
        method: "POST",
        url: "/elevenlabs/tools/schedule_site_visit"
      }
    },
    auth: env.elevenLabsToolSecret ? "Bearer token or x-chariot-secret header required" : "No tool secret configured"
  });
});

elevenLabsRouter.post("/conversation-init", async (req, res, next) => {
  try {
    const phone = extractInitiationPhone(req.body);
    if (!phone) {
      res.status(400).json({ error: "phone, caller_id, from, or user_id is required" });
      return;
    }

    const contact = await resolveContact({
      phone,
      name: extractInitiationName(req.body),
      source: extractLeadSource(req.body)
    });

    let ownerSessionActive = false;
    if (contact.role === "owner") {
      const sessionState = await getOwnerSessionState(contact.phone);
      ownerSessionActive = sessionState.active;
    }

    if (contact.role !== "system") {
      await touchSession(contact.phone, true);
    }

    const history = (await getConversationHistory(contact.phone, 10)).reverse();
    const context = buildChariotAiContext({
      contact,
      history,
      source: extractLeadSource(req.body),
      ownerSessionActive
    });

    res.json({
      type: "conversation_initiation_client_data",
      user_id: contact.phone,
      dynamic_variables: context.dynamic_variables,
      conversation_config_override: {
        conversation: {
          text_only: true
        }
      },
      metadata: {
        company: context.company,
        tools: context.tools,
        instructions: context.instructions
      }
    });
  } catch (error) {
    next(error);
  }
});

elevenLabsRouter.post("/tools/:toolName", async (req, res, next) => {
  try {
    const toolName = req.params.toolName;
    const body = req.body || {};
    const parameters = body.parameters || body;
    const callerPhone =
      body.user_id ||
      body.phone ||
      body.dynamic_variables?.user_phone ||
      body.metadata?.phone;

    if (toolName === "save_listing" && callerPhone && !parameters.added_by) {
      parameters.added_by = callerPhone;
    }

    const result = await executeTool(toolName, parameters);
    res.json({
      ok: true,
      tool: toolName,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

elevenLabsRouter.post("/conversations/sync", async (req, res, next) => {
  try {
    const result = await syncConversationTranscript({
      conversationId: req.body.conversation_id || req.body.conversationId,
      phone: req.body.phone || req.body.user_id,
      role: req.body.role
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

elevenLabsRouter.post("/post-call", async (req, res, next) => {
  try {
    const result = await ingestElevenLabsWebhook(req.body || {}, "post_call");
    res.json(result);
  } catch (error) {
    next(error);
  }
});

elevenLabsRouter.post("/client-data", async (req, res, next) => {
  try {
    const result = await ingestElevenLabsWebhook(req.body || {}, "client_data");
    res.json(result);
  } catch (error) {
    next(error);
  }
});
