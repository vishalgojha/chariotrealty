# Chariot Realty Backend For ElevenLabs

Node.js backend service for Chariot Realty where ElevenLabs owns the WhatsApp channel and this app provides CRM state, personalization, server tools, and transcript sync through Supabase.

## Architecture

- ElevenLabs is the WhatsApp transport owner
- This service does not send or receive WhatsApp messages directly
- ElevenLabs calls this backend for:
  - conversation initiation personalization
  - server tool execution
  - transcript sync / post-call ingestion
- Supabase remains the source of truth for:
  - `contacts`
  - `listings`
  - `leads`
  - `conversations`
  - `sessions`

## What This Service Handles

- Resolves incoming users into `owner`, `broker`, `lead`, or `system`
- Seeds Kapil (`9773757759`) as the owner contact
- Treats `9137833547` as a system/UI number and never as a lead or broker
- Auto-creates unknown contacts as leads in Supabase during conversation initiation
- Tracks owner sessions with a 10-minute timeout
- Exposes ElevenLabs server tools:
  - `search_listings`
  - `save_listing`
  - `get_leads`
  - `update_lead_status`
  - `get_inventory_summary`
  - `schedule_site_visit`
- Returns CRM-backed dynamic variables for ElevenLabs personalization
- Syncs ElevenLabs transcripts back into Supabase conversation memory

## Endpoints

- `GET /health`
- `GET /elevenlabs/manifest`
- `POST /elevenlabs/conversation-init`
- `POST /elevenlabs/tools/:toolName`
- `POST /elevenlabs/conversations/sync`
- `POST /elevenlabs/post-call`
- `POST /listings`
- `GET /leads`
- `GET /inventory`
- `GET /conversations/:phone`

## Required Environment Variables

```env
ELEVENLABS_API_KEY=
ELEVENLABS_AGENT_ID=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
KAPIL_PHONE=9773757759
SYSTEM_NUMBER=9137833547
SESSION_TIMEOUT_MINUTES=10
PORT=3000
```

Optional hardening:

```env
ELEVENLABS_TOOL_SECRET=
```

If `ELEVENLABS_TOOL_SECRET` is set, protect ElevenLabs endpoints with:

- `Authorization: Bearer <secret>`
- or `x-chariot-secret: <secret>`

## Supabase Setup

Run [schema.sql](/C:/Users/visha/Documents/Playground/chariot-realty-middleware/supabase/schema.sql) in the Supabase SQL editor before starting the service.

## Local Run

```bash
npm install
cp .env.example .env
npm start
```

## ElevenLabs Setup

Configure your ElevenLabs agent to use:

- Conversation initiation webhook:
  - `POST /elevenlabs/conversation-init`
- Server tools:
  - `POST /elevenlabs/tools/search_listings`
  - `POST /elevenlabs/tools/save_listing`
  - `POST /elevenlabs/tools/get_leads`
  - `POST /elevenlabs/tools/update_lead_status`
  - `POST /elevenlabs/tools/get_inventory_summary`
  - `POST /elevenlabs/tools/schedule_site_visit`

You can inspect the available backend endpoints via:

- [manifest](/C:/Users/visha/Documents/Playground/chariot-realty-middleware/src/routes/elevenlabs.js)
- `GET /elevenlabs/manifest`

For conversation memory, configure either:

- a post-call webhook to `POST /elevenlabs/post-call`
- or call `POST /elevenlabs/conversations/sync` with a `conversation_id`

## Example Requests

Conversation initiation:

```bash
curl -X POST http://localhost:3000/elevenlabs/conversation-init \
  -H "Content-Type: application/json" \
  -d "{\"caller_id\":\"919900001111\",\"name\":\"Aarav\",\"source\":\"meta_ads\"}"
```

Tool call:

```bash
curl -X POST http://localhost:3000/elevenlabs/tools/search_listings \
  -H "Content-Type: application/json" \
  -d "{\"bhk\":3,\"area\":\"BKC\",\"budget\":80000000,\"deal_type\":\"buy\"}"
```

Transcript sync:

```bash
curl -X POST http://localhost:3000/elevenlabs/conversations/sync \
  -H "Content-Type: application/json" \
  -d "{\"conversation_id\":\"YOUR_CONVERSATION_ID\",\"phone\":\"9773757759\"}"
```

## Notes

- Broker roles must exist in `contacts` ahead of time, otherwise unknown numbers default to `lead`.
- The agent prompt should use dynamic variables like `{{user_name}}`, `{{user_role}}`, `{{crm_history}}`, and `{{owner_session_active}}`.
- Meta transport tokens are not required in this architecture because ElevenLabs is the WhatsApp integration owner.
