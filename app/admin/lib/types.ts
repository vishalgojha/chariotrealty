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
  custom_fields?: Record<string, string | number | boolean>;
  status: string;
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
