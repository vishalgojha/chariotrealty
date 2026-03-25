import { Router } from "express";
import { getConversationHistory } from "../services/conversation-service.js";

export const conversationsRouter = Router();

conversationsRouter.get("/:phone", async (req, res, next) => {
  try {
    const conversations = await getConversationHistory(req.params.phone, Number(req.query.limit || 50));
    res.json(conversations.reverse());
  } catch (error) {
    next(error);
  }
});
