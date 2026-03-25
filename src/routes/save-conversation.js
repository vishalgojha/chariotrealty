import { Router } from "express";
import { saveConversation } from "../services/conversation-service.js";

export const saveConversationRouter = Router();

saveConversationRouter.post("/", async (req, res, next) => {
  try {
    await saveConversation(req.body || {});
    res.status(201).json({ ok: true });
  } catch (error) {
    next(error);
  }
});
