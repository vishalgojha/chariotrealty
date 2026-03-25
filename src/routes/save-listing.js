import { Router } from "express";
import { saveListing } from "../services/listing-service.js";

export const saveListingRouter = Router();

saveListingRouter.post("/", async (req, res, next) => {
  try {
    const listing = await saveListing(req.body || {});
    res.status(201).json(listing);
  } catch (error) {
    next(error);
  }
});
