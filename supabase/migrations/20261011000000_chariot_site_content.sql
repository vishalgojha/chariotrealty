-- Editable marketing copy for the public site, keyed by section.
--
-- The public site used to hard-code its "About" copy in the page component, so
-- changing a headline meant a deploy. This table lets the admin backend edit
-- sections (about_us for now) and publish them without touching code. One row
-- per section keeps the shape simple and the read a single small query.
create table if not exists public.chariot_site_content (
  section text primary key,
  title text not null default '',
  content_body text not null default '',
  highlight_bullet_points jsonb not null default '[]'::jsonb,
  cta_link text,
  updated_at timestamptz not null default now()
);

alter table public.chariot_site_content enable row level security;

-- Seed the about_us section so a fresh database already renders a sane section.
insert into public.chariot_site_content (section, title, content_body, highlight_bullet_points, cta_link)
values (
  'about_us',
  'About Chariot Realty',
  'A boutique Bandra-based real-estate agency for prime rentals, corporate residences and direct developer mandates across Mumbai''s western suburbs. You speak directly to the broker, never a portal.',
  '["Direct mandates from builders and verified corporate relocation inventory","Live price bands, transit routing and curated listings across Bandra and BKC","WhatsApp-first: one broker, verified shortlists the same day, no paid site visits"]'::jsonb,
  'https://wa.me/919773757759?text=Hi%20Kapil%2C%20I%27d%20like%20to%20know%20more%20about%20Chariot%20Realty.'
)
on conflict (section) do nothing;
