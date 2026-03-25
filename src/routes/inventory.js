import { Router } from "express";
import { getInventory } from "../services/listing-service.js";
import { formatCurrency } from "../utils/format.js";

export const inventoryRouter = Router();

inventoryRouter.get("/", async (req, res, next) => {
  try {
    const listings = await getInventory({
      added_by: req.query.added_by,
      deal_type: req.query.deal_type,
      limit: req.query.limit
    });

    if (req.accepts("html") && String(req.query.format || "").toLowerCase() !== "json") {
      const rows = listings.map((listing) => `
        <tr>
          <td>${listing.building_name}</td>
          <td>${listing.bhk || ""}</td>
          <td>${listing.area || ""}</td>
          <td>${listing.deal_type || ""}</td>
          <td>${formatCurrency(listing.price)}</td>
          <td>${listing.sq_ft || ""}</td>
          <td>${listing.added_by || ""}</td>
          <td>${listing.created_at}</td>
        </tr>
      `).join("");

      res.type("html").send(`
        <!doctype html>
        <html lang="en">
          <head>
            <meta charset="utf-8" />
            <title>Chariot Realty Inventory</title>
            <style>
              body { font-family: Georgia, serif; margin: 32px; background: #f2efe8; color: #1f1a17; }
              table { width: 100%; border-collapse: collapse; background: white; }
              th, td { border: 1px solid #d9c7b7; padding: 10px; text-align: left; }
              th { background: #d9cfbe; }
            </style>
          </head>
          <body>
            <h1>Inventory</h1>
            <table>
              <thead>
                <tr>
                  <th>Building</th>
                  <th>BHK</th>
                  <th>Area</th>
                  <th>Deal Type</th>
                  <th>Price</th>
                  <th>Sq Ft</th>
                  <th>Added By</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </body>
        </html>
      `);
      return;
    }

    res.json(listings);
  } catch (error) {
    next(error);
  }
});
