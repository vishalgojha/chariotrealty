import { Router } from "express";
import { env, isElevenLabsConfigured, isSupabaseConfigured, isWhatsAppConfigured } from "../config/env.js";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "chariot-realty-middleware",
    integrations: {
      whatsappConfigured: isWhatsAppConfigured(),
      elevenLabsConfigured: isElevenLabsConfigured(),
      supabaseConfigured: isSupabaseConfigured()
    },
    sessionTimeoutMinutes: env.sessionTimeoutMinutes,
    timestamp: new Date().toISOString()
  });
});
