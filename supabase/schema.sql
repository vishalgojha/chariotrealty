CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS contacts (
  phone TEXT PRIMARY KEY,
  name TEXT,
  role TEXT
);

CREATE TABLE IF NOT EXISTS listings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  building_name TEXT,
  bhk INT,
  area TEXT,
  deal_type TEXT,
  price NUMERIC,
  sq_ft INT,
  floor TEXT,
  view TEXT,
  notes TEXT,
  added_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT,
  name TEXT,
  bhk INT,
  area TEXT,
  budget NUMERIC,
  deal_type TEXT,
  status TEXT,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT,
  role TEXT,
  message TEXT,
  sender TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  phone TEXT PRIMARY KEY,
  last_active TIMESTAMPTZ,
  active BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_conversations_phone_timestamp
  ON conversations (phone, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_leads_phone_created
  ON leads (phone, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_listings_added_by_created
  ON listings (added_by, created_at DESC);

INSERT INTO contacts (phone, name, role)
VALUES ('9773757759', 'Kapil', 'owner')
ON CONFLICT (phone) DO UPDATE
SET name = EXCLUDED.name, role = EXCLUDED.role;
