-- Chariot WhatsApp: raw store lockdown + on-demand extraction provenance.
--
-- 1. chariot_whatsapp_messages holds personal contact data and broker
--    negotiations. It was created without RLS, so any PostgREST role with a
--    table grant could read every raw message. Enable RLS with no policies:
--    the service role (Next.js API routes) and the whatsmeow ingestor's direct
--    Postgres connection bypass RLS, so both writers keep working while
--    anon/authenticated read nothing.
-- 2. Retention pruning (prune_chariot_whatsapp_messages) scans by created_at
--    every 24 hours, which had no supporting index.
-- 3. Extraction is on demand, so a typed row must be able to point back at the
--    exact raw message it came from, snapshot what the model extracted, and
--    refuse to extract the same message twice into the same table.

alter table public.chariot_whatsapp_messages enable row level security;

create index if not exists chariot_whatsapp_messages_created_at_idx
  on public.chariot_whatsapp_messages (created_at);

-- raw_message_id: provenance link to the raw WhatsApp message.
-- on delete set null: the 30-day retention prune must not delete saved drafts.
-- ai_extraction: what the assistant extracted on demand, including a snapshot
-- of the source text so provenance survives retention.
do $$
declare
  target text;
begin
  foreach target in array array[
    'chariot_residential_sale_listings',
    'chariot_residential_rent_listings',
    'chariot_commercial_sale_listings',
    'chariot_commercial_rent_listings',
    'chariot_residential_sale_requirements',
    'chariot_residential_rent_requirements',
    'chariot_commercial_sale_requirements',
    'chariot_commercial_rent_requirements'
  ] loop
    execute format(
      'alter table public.%I add column if not exists raw_message_id bigint references public.chariot_whatsapp_messages(id) on delete set null',
      target
    );
    execute format(
      'alter table public.%I add column if not exists ai_extraction jsonb not null default ''{}''::jsonb',
      target
    );
    -- One extraction per raw message per table: the dedupe guard for on-demand
    -- extraction. Partial, so internal drafts without a source are unaffected.
    execute format(
      'create unique index if not exists %I on public.%I (raw_message_id) where raw_message_id is not null',
      target || '_raw_message_id_key',
      target
    );
  end loop;
end $$;

comment on column public.chariot_residential_sale_listings.raw_message_id is
  'Raw WhatsApp message this row was extracted from; null unless extracted on demand.';
comment on column public.chariot_residential_sale_listings.ai_extraction is
  'Snapshot of the on-demand extraction (model, fields, source text, timestamp) for this WhatsApp message.';
