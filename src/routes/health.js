import { Router } from "express";
import { env, isElevenLabsConfigured, isSupabaseConfigured } from "../config/env.js";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "chariot-realty-middleware",
    company: "Chariot Realty",
    transportMode: "propai_live_with_elevenlabs_hooks",
    integrations: {
      elevenLabsConfigured: isElevenLabsConfigured(),
      supabaseConfigured: isSupabaseConfigured()
    },
    toolEndpointProtection: Boolean(env.elevenLabsToolSecret),
    sessionTimeoutMinutes: env.sessionTimeoutMinutes,
    timestamp: new Date().toISOString()
  });
});
