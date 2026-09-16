create table if not exists public.chariot_properties (
  id uuid primary key default gen_random_uuid(), slug text not null unique, name text not null,
  category text not null check (category in ('residential','commercial','under-construction')),
  locality text not null, micro_market text not null, location text not null, price text not null,
  price_value numeric, price_unit text not null default 'total_price', carpet_area_sqft numeric,
  configuration text, parking integer, possession text, rera_approved boolean,
  status text not null default 'draft' check (status in ('draft','approved','published','archived')),
  image_url text, description text, source text not null default 'chariot_admin', source_reference text,
  owner_name text not null default 'Kapil Gopal Ojha', published_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.chariot_properties add column if not exists custom_fields jsonb not null default '{}'::jsonb;
create table if not exists public.chariot_inventory_fields (
  id uuid primary key default gen_random_uuid(),
  field_key text not null unique,
  label text not null,
  field_type text not null default 'text' check (field_type in ('text','textarea','number','boolean','date','url')),
  required boolean not null default false,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.chariot_inventory_fields enable row level security;
create table if not exists public.chariot_property_images (
  id uuid primary key default gen_random_uuid(), property_id uuid not null references public.chariot_properties(id) on delete cascade,
  storage_path text not null, public_url text not null, alt_text text, sort_order integer not null default 0, created_at timestamptz not null default now()
);
create index if not exists chariot_properties_status_idx on public.chariot_properties(status, updated_at desc);
create index if not exists chariot_properties_locality_idx on public.chariot_properties(locality);
alter table public.chariot_properties enable row level security;
alter table public.chariot_property_images enable row level security;
insert into storage.buckets (id, name, public) values ('chariot-inventory', 'chariot-inventory', true) on conflict (id) do nothing;
