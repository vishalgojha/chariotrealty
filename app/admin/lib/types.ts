export type Property = {
  id: string;
  name: string;
  category: string;
  locality: string;
  price: string;
  carpetAreaSqft: number;
  configuration?: string;
  status: string;
  image?: string;
};

export type Market = {
  name: string;
  positioning: string;
  transit: string[];
};

export type Lead = {
  id: string;
  name: string;
  phone: string;
  intent: string;
  locality?: string;
  property_id?: string;
  message?: string | null;
  created_at: string;
  status: string;
  priority?: "low" | "normal" | "high" | "urgent";
  next_follow_up_at?: string | null;
  last_contacted_at?: string | null;
  follow_up_note?: string | null;
};

export type CmsFieldType = "text" | "textarea" | "number" | "boolean" | "date" | "url";

export type CmsField = {
  id: string;
  field_key: string;
  label: string;
  field_type: CmsFieldType;
  required: boolean;
  sort_order: number;
};

export type CmsProperty = {
  id: string;
  slug: string;
  name: string;
  category: string;
  locality: string;
  micro_market: string;
  location: string;
  price: string;
  configuration?: string;
  carpet_area_sqft?: number;
  image_url?: string;
  media_type?: "image" | "video";
  // Values can be arrays: the typed listing tables store amenities as lists.
  custom_fields?: Record<string, string | number | boolean | string[]>;
  status: string;
  // Internal provenance. A parsed listing keeps the message it came from in
  // description, so both of these stay admin-only and are never published.
  // The supplier is shown in the admin so we know who to credit and follow up
  // with; the public site always credits Kapil instead.
  source?: string | null;
  source_reference?: string | null;
  description?: string | null;
  source_sender?: string | null;
  source_group?: string | null;
  source_phone?: string | null;
  source_message_at?: string | null;
};

export type WhatsappStatus = {
  connected?: boolean;
  connection_state?: string;
  phone_number?: string;
  broker_id?: string;
  qr?: string | null;
  pairing_code?: string;
  pairing_window_expires_at?: string;
  error?: string;
};

export const CATEGORY_LABELS: Record<string, string> = {
  residential: "Residential",
  commercial: "Commercial",
  "under-construction": "New launch",
};

// Where a listing came from, in the words we would say out loud. The stored
// value is kept verbatim in the database; this is only for display.
const SOURCE_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp message",
  agent: "Chariot Assistant",
  chariot_admin: "Added by us",
  dictation: "Dictated in the Assistant",
  manual: "Entered by hand",
  website: "Website enquiry",
};

export function sourceLabel(source?: string | null): string {
  const key = (source || "").trim().toLowerCase();
  if (!key) return "Not recorded";
  return SOURCE_LABELS[key] ?? key.replace(/[_-]+/g, " ");
}

export const FIELD_TYPE_LABELS: Record<CmsFieldType, string> = {
  text: "Text",
  textarea: "Long text",
  number: "Number",
  boolean: "Yes / No",
  date: "Date",
  url: "URL",
};

export const FIELD_TYPE_OPTIONS = Object.entries(FIELD_TYPE_LABELS).map(([value, label]) => ({ value: value as CmsFieldType, label }));

export type TabId = "overview" | "whatsapp" | "inventory" | "leads" | "agent" | "markets";

// A draft that lives in one of the typed listing tables, which is where
// WhatsApp extraction and dictation save new listings.
export type TypedDraft = {
  table: string;
  id: number;
  name: string;
  locality: string;
  configuration: string;
  price: string;
  source: string;
  created_at: string;
  published_slug: string | null;
  published_status: string | null;
};
