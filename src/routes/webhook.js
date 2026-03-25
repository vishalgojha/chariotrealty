import { Router } from "express";
import { env } from "../config/env.js";
import { parseWhatsAppPayload } from "../integrations/whatsapp.js";
import { routeIncomingMessage } from "../services/message-router.js";

export const webhookRouter = Router();

webhookRouter.get("/", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token && token === env.whatsappVerifyToken) {
    res.status(200).send(challenge);
    return;
  }

  res.status(403).json({ error: "Webhook verification failed" });
});

webhookRouter.post("/", async (req, res, next) => {
  try {
    const inboundMessages = parseWhatsAppPayload(req.body);
    const results = [];

    for (const inboundMessage of inboundMessages) {
      const result = await routeIncomingMessage(inboundMessage);
      results.push({
        phone: result.contact.phone,
        role: result.contact.role,
        reply: result.reply,
        source: result.source
      });
    }

    res.json({
      ok: true,
      processed: results.length,
      results
    });
  } catch (error) {
    next(error);
  }
});
