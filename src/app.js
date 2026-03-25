import express from "express";
import { isSupabaseConfigured } from "./config/env.js";
import { seedKnownContacts } from "./services/contact-service.js";
import { conversationsRouter } from "./routes/conversations.js";
import { elevenLabsRouter } from "./routes/elevenlabs.js";
import { healthRouter } from "./routes/health.js";
import { inventoryRouter } from "./routes/inventory.js";
import { leadsRouter } from "./routes/leads.js";
import { listingsRouter } from "./routes/listings.js";
import { saveConversationRouter } from "./routes/save-conversation.js";
import { saveLeadRouter } from "./routes/save-lead.js";
import { saveListingRouter } from "./routes/save-listing.js";
import { webhookRouter } from "./routes/webhook.js";

export async function createApp() {
  if (isSupabaseConfigured()) {
    try {
      await seedKnownContacts();
    } catch (error) {
      console.warn(`[startup] Supabase is configured, but initialization is incomplete: ${error.message}`);
    }
  } else {
    console.warn("[startup] Supabase is not configured yet. Health endpoint will work, but data routes will require env vars.");
  }

  const app = express();
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.get("/", (_req, res) => {
    res.json({
      service: "chariot-realty-middleware",
      status: "ok",
      company: "Chariot Realty",
      transportMode: "propai_live_with_elevenlabs_hooks"
    });
  });

  app.use("/health", healthRouter);
  app.use("/webhook", webhookRouter);
  app.use("/save-conversation", saveConversationRouter);
  app.use("/save-lead", saveLeadRouter);
  app.use("/save-listing", saveListingRouter);
  app.use("/elevenlabs", elevenLabsRouter);
  app.use("/listings", listingsRouter);
  app.use("/leads", leadsRouter);
  app.use("/inventory", inventoryRouter);
  app.use("/conversations", conversationsRouter);

  app.use((error, _req, res, _next) => {
    console.error("[server:error]", error);
    res.status(500).json({
      error: error.message || "Internal server error"
    });
  });

  return app;
}
