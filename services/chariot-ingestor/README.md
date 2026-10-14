# Chariot WhatsApp Raw Data Ingestor

A minimal Go service that:
1. Connects to WhatsApp via whatsmeow
2. Fetches ALL raw message history from groups and chats (when `DISABLE_HISTORY_SYNC=false`)
3. Stores raw messages in `chariot_whatsapp_messages` table
4. **Does NOT do LLM extraction** - extraction happens on-demand via the agent's `extract_whatsapp_listing` tool

## Architecture

```
WhatsApp (phone) ←── whatsmeow ──→ chariot-ingestor ──→ Supabase (chariot_whatsapp_messages)
                                                                  ↑
                                                                  │ on-demand extraction
                                                                  ↓
                                                     Agent tool: extract_whatsapp_listing
```

## Setup

1. Copy `.env.example` to `.env` and fill in values:
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

2. Required environment variables:
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_SERVICE_KEY` - Service role key (bypasses RLS)
   - `WHATSAPP_BROKER_ID` - Unique ID for this broker (matches `broker_id` in DB)
   - `DISABLE_HISTORY_SYNC` - Set to `false` to enable history sync (default: `false`)

3. Run:
   ```bash
   go run main.go
   # Or with Docker:
   docker build -t chariot-ingestor .
   docker run --env-file .env chariot-ingestor
   ```

## How it works

### On startup:
1. Connects to WhatsApp using stored session (or shows QR code for first run)
2. On connection, requests history sync from WhatsApp server
3. Receives `HistorySync` events with all conversations and messages
4. Stores each message in `chariot_whatsapp_messages` table

### Ongoing:
- Listens for new `Message` events in real-time
- Stores them immediately in the same table

### No LLM extraction during ingestion:
- Messages are stored RAW with full payload
- `extract_whatsapp_listing` agent tool is called ONLY when user explicitly asks
- This keeps ingestion fast and avoids unnecessary API costs

## Database Schema

```sql
CREATE TABLE chariot_whatsapp_messages (
  id BIGSERIAL PRIMARY KEY,
  broker_id TEXT NOT NULL,
  group_name TEXT NOT NULL DEFAULT '',
  sender TEXT NOT NULL DEFAULT '',
  sender_jid TEXT NOT NULL DEFAULT '',
  sender_phone TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  message_type TEXT NOT NULL DEFAULT 'text',
  is_group BOOLEAN NOT NULL DEFAULT false,
  message_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  message_uid TEXT NOT NULL,
  event_id TEXT NOT NULL,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  reply_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (broker_id, message_uid)
);
```

## Retention

Run periodically to prune old messages (30-day default):
```sql
SELECT prune_chariot_whatsapp_messages('30 days');
```

## Integration with Self-Chat

The self-chat agent uses two tools:
1. `search_whatsapp_messages` - searches raw messages in `chariot_whatsapp_messages`
2. `extract_whatsapp_listing` - on-demand LLM extraction of a specific message ID into a structured listing

This ensures:
- Raw data is always available (source of truth)
- Extraction only happens when explicitly requested
- No duplicate extractions (checks `raw_message_id` before creating)
