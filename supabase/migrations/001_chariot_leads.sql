create table if not exists public.chariot_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  email text,
  intent text not null default 'rent',
  locality text,
  property_id text,
  message text,
  source text not null default 'website',
  status text not null default 'new',
  city text not null default 'Mumbai',
  created_at timestamptz not null default now()
);

create index if not exists chariot_leads_created_at_idx on public.chariot_leads (created_at desc);
create index if not exists chariot_leads_locality_idx on public.chariot_leads (locality);
alter table public.chariot_leads enable row level security;
