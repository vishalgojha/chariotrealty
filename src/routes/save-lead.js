import { Router } from "express";
import { saveLeadRecord } from "../services/ingress-service.js";

export const saveLeadRouter = Router();

saveLeadRouter.post("/", async (req, res, next) => {
  try {
    const lead = await saveLeadRecord(req.body || {});
    res.status(201).json(lead);
  } catch (error) {
    next(error);
  }
});
