create table if not exists public.chariot_whatsapp_messages (
  id bigint generated always as identity primary key,
  broker_id text not null,
  group_name text not null default '',
  sender text not null default '',
  sender_jid text not null default '',
  sender_phone text not null default '',
  message text not null default '',
  message_type text not null default 'text',
  is_group boolean not null default false,
  message_timestamp timestamptz not null default now(),
  raw_payload jsonb not null default '{}'::jsonb,
  message_uid text not null,
  event_id text not null,
  attachments jsonb not null default '[]'::jsonb,
  reply_context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (broker_id, message_uid)
);

create index if not exists chariot_whatsapp_messages_time_idx
  on public.chariot_whatsapp_messages (broker_id, message_timestamp desc, id desc);

create index if not exists chariot_whatsapp_messages_search_idx
  on public.chariot_whatsapp_messages (broker_id, sender_phone, message_timestamp desc);

create or replace function public.prune_chariot_whatsapp_messages(
  p_older_than interval default interval '30 days'
) returns integer language sql set search_path = public as $$
  with deleted as (
    delete from public.chariot_whatsapp_messages
    where created_at < now() - coalesce(p_older_than, interval '30 days')
    returning id
  )
  select count(*)::integer from deleted;
$$;

comment on function public.prune_chariot_whatsapp_messages(interval) is
  'Deletes Chariot raw WhatsApp messages older than the 30-day retention window.';
