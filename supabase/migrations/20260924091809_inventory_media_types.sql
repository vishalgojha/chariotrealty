alter table public.chariot_properties
  add column if not exists media_type text not null default 'image'
    check (media_type in ('image', 'video'));
