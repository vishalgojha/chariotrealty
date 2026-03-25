import { Router } from "express";
import { saveListing } from "../services/listing-service.js";

export const listingsRouter = Router();

listingsRouter.post("/", async (req, res, next) => {
  try {
    const listing = req.body || {};
    if (!listing.building_name) {
      res.status(400).json({ error: "building_name is required" });
      return;
    }

    const saved = await saveListing({
      ...listing,
      added_by: listing.added_by || "manual"
    });

    res.status(201).json(saved);
  } catch (error) {
    next(error);
  }
});
