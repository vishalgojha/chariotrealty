# Chariot Realty Production Middleware

Production middleware for Chariot Realty using a PropAI Live-compatible ingress pattern, Supabase for persistence, and ElevenLabs-ready dynamic variables and tool hooks.

## Chariot Business Rules

- Company: `Chariot Realty`
- Owner: `Kapil Ojha` (`9773757759`)
- Premium focus:
  - Bandra
  - BKC
  - Bandra East
  - South Mumbai
- Business WhatsApp number: `+91 91378 33547`
- System numbers are logged only and never activate AI

## Core Flows

- Contact resolution:
  - unknown number -> `lead`
  - Kapil -> `owner`
  - system number -> log only
- Lead flow:
  - qualify `bhk`, `area`, `budget`, `deal_type`
  - search listings
  - offer site visits
- Broker flow:
  - parse shared inventory
  - save listings
  - confirm addition
- Owner flow:
  - 10-minute session activation
  - never treated as a lead
  - supports commands like `Show leads today`, `Add listing ...`, `How many inquiries this week?`

## Endpoints

- `POST /webhook`
- `POST /save-conversation`
- `POST /save-lead`
- `POST /save-listing`
- `GET /leads`
- `GET /inventory`
- `GET /conversations/:phone`
- `GET /health`

Additional ElevenLabs-compatible endpoints:

- `GET /elevenlabs/manifest`
- `POST /elevenlabs/conversation-init`
- `POST /elevenlabs/tools/:toolName`
- `POST /elevenlabs/client-data`
- `POST /elevenlabs/conversations/sync`
- `POST /elevenlabs/post-call`

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

## Database

Run [schema.sql](/C:/Users/visha/Documents/Playground/chariot-realty-middleware/supabase/schema.sql) in Supabase before production use.

Tables expected:

- `contacts`
- `listings`
- `leads`
- `conversations`
- `sessions`

## Production Ingress

Use `POST /webhook` as the main upstream ingress. It:

- resolves the contact
- stores the inbound message
- applies Chariot role rules
- returns either:
  - a direct shortcut/business response, or
  - AI-ready context for PropAI Live / ElevenLabs

Example:

```bash
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d "{\"phone\":\"919900001111\",\"name\":\"Aarav\",\"message\":\"Looking for 3BHK in BKC around 8 cr\",\"source\":\"meta_ads\"}"
```

## Save Endpoints

- `POST /save-conversation`
- `POST /save-lead`
- `POST /save-listing`

These are useful for server tool callbacks, admin actions, or external PropAI Live pipeline steps.

## ElevenLabs Setup

Dynamic variables returned by this service include:

- `{{user_name}}`
- `{{role}}`
- `{{user_role}}`
- `{{user_phone}}`
- `{{lead_source}}`
- `{{crm_history}}`
- `{{owner_session_active}}`

Tool endpoints:

- `/elevenlabs/tools/resolve_contact_context`
- `/elevenlabs/tools/search_listings`
- `/elevenlabs/tools/save_listing`
- `/elevenlabs/tools/get_leads`
- `/elevenlabs/tools/update_lead_status`
- `/elevenlabs/tools/get_inventory_summary`
- `/elevenlabs/tools/schedule_site_visit`

Transcript sync:

- `/elevenlabs/client-data`
- `/elevenlabs/post-call`
- `/elevenlabs/conversations/sync`

For ElevenLabs WhatsApp specifically, use `resolve_contact_context` as the first server tool and pass the WhatsApp caller ID from ElevenLabs system variables such as `{{system__caller_id}}`.

Webhook ingestion behavior:

- `client-data`:
  - accepts real-time updates
  - stores latest utterance
  - applies lead data-collection updates (BHK, area, budget, deal type, status, source)
- `post-call`:
  - stores transcript
  - ingests analysis/data-collection payloads
  - can save broker listing details when present

## Local Run

```bash
npm install
cp .env.example .env
npm start
```

## Notes

- Broker contacts should exist in `contacts` ahead of time, otherwise unknown numbers default to `lead`.
- Kapil gets special treatment through owner session logic and shortcut handling.
- `SYSTEM_NUMBER` traffic is recorded but never activates AI.
- The app can boot before the schema exists, but production behavior depends on Supabase being initialized.
- `ELEVENLABS_AGENT_ID` is optional in the current implementation; `ELEVENLABS_API_KEY` is the important one for transcript/API features.
