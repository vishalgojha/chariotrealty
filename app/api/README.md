# Chariot Realty Mumbai API

The API is available under `/api` on the deployed Next.js service.

## Endpoints

- `GET /api/health` — deployment health check.
- `GET /api/properties?locality=BKC&category=commercial` — filtered Mumbai inventory. Supported filters: `locality`, `category`, `configuration`, `minCarpet`, `maxCarpet`.
- `GET /api/markets` — supported Mumbai micro-market metadata.
- `POST /api/leads` — validates and accepts a Mumbai buyer, renter, seller, or investor enquiry.
- `GET /api/automation/status` — reports whether Composio lead automation is configured.
- `POST /api/automation/lead` — admin-only manual automation replay for an existing lead.

Example lead body:

```json
{
  "name": "Aarav Mehta",
  "phone": "+91 9773757759",
  "intent": "rent",
  "locality": "BKC",
  "propertyId": "ten-bkc",
  "source": "website"
}
```

Lead storage uses the `public.chariot_leads` table in the configured Supabase project. The server requires `SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`) and `SUPABASE_SERVICE_ROLE_KEY`; the service key is never sent to the browser.

Composio automation is enabled only when `COMPOSIO_API_KEY`, `COMPOSIO_AUTOMATION_ENABLED=true`, and `CHARIOT_OWNER_EMAIL` are configured. A new lead then sends an owner notification through `GMAIL_SEND_EMAIL`. Connect Gmail with `composio link gmail` before enabling the workflow.
