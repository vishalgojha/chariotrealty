import { Router } from "express";
import { getLeads } from "../services/lead-service.js";

export const leadsRouter = Router();

leadsRouter.get("/", async (req, res, next) => {
  try {
    const leads = await getLeads({
      status: req.query.status,
      phone: req.query.phone,
      deal_type: req.query.deal_type,
      period: req.query.period,
      source: req.query.source,
      limit: req.query.limit
    });

    if (req.accepts("html") && String(req.query.format || "").toLowerCase() !== "json") {
      const rows = leads.map((lead) => `
        <tr>
          <td>${lead.name || ""}</td>
          <td>${lead.phone}</td>
          <td>${lead.bhk || ""}</td>
          <td>${lead.area || ""}</td>
          <td>${lead.budget || ""}</td>
          <td>${lead.deal_type || ""}</td>
          <td>${lead.source || ""}</td>
          <td>${lead.status}</td>
          <td>${lead.created_at}</td>
        </tr>
      `).join("");

      res.type("html").send(`
        <!doctype html>
        <html lang="en">
          <head>
            <meta charset="utf-8" />
            <title>Chariot Realty Leads</title>
            <style>
              body { font-family: Georgia, serif; margin: 32px; background: #f7f0e8; color: #1f1a17; }
              table { width: 100%; border-collapse: collapse; background: white; }
              th, td { border: 1px solid #d9c7b7; padding: 10px; text-align: left; }
              th { background: #ead9ca; }
              h1 { margin-bottom: 16px; }
            </style>
          </head>
          <body>
            <h1>Chariot Realty Leads</h1>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>BHK</th>
                  <th>Area</th>
                  <th>Budget</th>
                  <th>Deal Type</th>
                  <th>Source</th>
                  <th>Status</th>
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

    res.json(leads);
  } catch (error) {
    next(error);
  }
});
