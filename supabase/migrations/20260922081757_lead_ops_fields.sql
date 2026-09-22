alter table public.chariot_leads
  add column if not exists priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'urgent')),
  add column if not exists next_follow_up_at timestamptz,
  add column if not exists last_contacted_at timestamptz,
  add column if not exists follow_up_note text,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists chariot_leads_follow_up_idx
  on public.chariot_leads (next_follow_up_at)
  where status not in ('converted', 'closed');
