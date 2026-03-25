# Chariot Realty Middleware

Node.js middleware service for Chariot Realty that sits between WhatsApp Business API and an ElevenLabs conversational agent, with Supabase as the source of truth.

## What This Service Handles

- Resolves incoming WhatsApp numbers into `owner`, `broker`, `lead`, or `system`
- Seeds Kapil (`9773757759`) as the owner contact
- Treats `9137833547` as a system/UI number and never as a lead or broker
- Auto-creates unknown contacts as leads in Supabase
- Stores conversation history and fetches the last 10 messages for ElevenLabs context
- Tracks sessions in Supabase, including Kapil's 10-minute owner session timeout
- Saves broker listings into inventory
- Exposes tool handlers to ElevenLabs:
  - `search_listings`
  - `save_listing`
  - `get_leads`
  - `update_lead_status`
  - `get_inventory_summary`
  - `schedule_site_visit`
- Includes deterministic fallback replies if ElevenLabs is not configured yet

## Endpoints

- `POST /webhook` receive WhatsApp messages
- `GET /webhook` WhatsApp verification callback
- `GET /health` Railway health check
- `POST /listings` manual listing add
- `GET /leads` leads dashboard or JSON
- `GET /inventory` inventory dashboard or JSON
- `GET /conversations/:phone` fetch conversation history

## Required Environment Variables

```env
WHATSAPP_TOKEN=
WHATSAPP_PHONE_ID=
ELEVENLABS_API_KEY=
ELEVENLABS_AGENT_ID=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
KAPIL_PHONE=9773757759
SYSTEM_NUMBER=9137833547
SESSION_TIMEOUT_MINUTES=10
PORT=3000
```

`WHATSAPP_VERIFY_TOKEN` is optional but recommended for Meta webhook verification.

## Supabase Setup

Run [supabase/schema.sql](/C:/Users/visha/Documents/Playground/chariot-realty-middleware/supabase/schema.sql) in the Supabase SQL editor before starting the service.

That schema creates:

- `contacts`
- `listings`
- `leads`
- `conversations`
- `sessions`

It also seeds Kapil as the owner contact.

## Local Run

```bash
npm install
cp .env.example .env
npm start
```

If you do not set ElevenLabs or WhatsApp credentials yet, the service can still parse requests and produce dry-run/fallback behavior.

## Railway Deploy

1. Create a Railway service from this folder.
2. Add the environment variables above.
3. Deploy using the included [Dockerfile](/C:/Users/visha/Documents/Playground/chariot-realty-middleware/Dockerfile) or Railway's default Node build flow.
4. Set the health check path to `/health`.

## Quick Webhook Test

Simplified payload:

```json
{
  "from": "919900001111",
  "name": "Aarav",
  "text": "Looking for 3BHK in BKC around 8 cr to buy",
  "source": "meta_ads"
}
```

Example:

```bash
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d "{\"from\":\"919900001111\",\"name\":\"Aarav\",\"text\":\"Looking for 3BHK in BKC around 8 cr to buy\",\"source\":\"meta_ads\"}"
```

## Notes

- Broker roles must exist in the `contacts` table ahead of time, otherwise unknown numbers default to `lead`.
- The owner flow supports direct shortcuts such as `Show leads today`, `Add listing ...`, `How many inquiries this week?`, and `Show broker listings`.
- System-number messages are logged to `conversations` but never routed to ElevenLabs.
