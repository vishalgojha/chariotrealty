import { Router } from "express";
import { processInboundWebhook } from "../services/ingress-service.js";

export const webhookRouter = Router();

webhookRouter.post("/", async (req, res, next) => {
  try {
    const result = await processInboundWebhook({
      phone: req.body.phone || req.body.from,
      name: req.body.name,
      message: req.body.message || req.body.text,
      source: req.body.source,
      timestamp: req.body.timestamp
    });

    const protocol = req.headers["x-forwarded-proto"] || req.protocol;
    const host = req.headers["x-forwarded-host"] || req.get("host");
    const baseUrl = `${protocol}://${host}`;

    res.json({
      ...result,
      tool_base_url: `${baseUrl}/elevenlabs/tools`,
      conversation_init_url: `${baseUrl}/elevenlabs/conversation-init`
    });
  } catch (error) {
    next(error);
  }
});
