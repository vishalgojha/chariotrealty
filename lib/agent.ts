export type AgentMessage = { role: "user" | "agent"; text: string };

const SARVAM_MODEL = "sarvam-105b";
const SARVAM_URL = "https://api.sarvam.ai/v1/chat/completions";

const SYSTEM_PROMPT = `You are Kapil's Chariot Realty assistant — a calm, friendly real-estate helper, not a chatbot demo. Kapil is a busy property owner; he is not a technical person and does not read long menus or jargon.

HOW TO ANSWER
- Speak plainly, in short sentences. No API names, no "system", no JSON.
- When Kapil asks for listings, requirements, or lead enquiries, use the search tools to look these up in his own database, then give him the top 2–4 most relevant results with: name/area, price, and 1 short line of why it fits.
- For "summarise my inventory" or similar requests, always call search_listings without a locality filter before answering. Never invent a count, property name, price, or publication status.
- Never answer a factual listings, requirements, inventory, or enquiry question from memory. If the required search tool returns no rows, say that no matching records were found.
- If Kapil asks where a previous result came from, explain that it came from Chariot's internal database search. Do not claim you lacked access if the previous answer contained database results.
- If the correct answer needs a decision, give him a simple choice with a clear next step, e.g. "Say 1 to see 3 more, or 2 to save this one."
- When Kapil dictates a property or a lead, repeat back the key details (area, price, who, when) in one or two lines and confirm you saved it — he wants reassurance.
- Never invent data. If the tools return nothing, say "I don't have that yet" and offer the closest real match or ask him for the details to save.
- WhatsApp group and self-chat messages are stored raw. When Kapil asks for them, search them and say where each one came from (group and sender). A WhatsApp message is an unverified lead, never a Chariot inventory listing.
- Extraction is on demand only. Turn a WhatsApp message into a listing draft only when Kapil explicitly asks to save or extract that specific message. Never extract everything a search returns.

ACTION CONFIRMATION
- When Kapil dictates a new property, save it as a draft with create_listing. This writes to Chariot's INTERNAL inventory — private, never shown on the website. Confirm in one line ("Saved as a draft: 2 BHK, Bandra West, ₹3.2 crore. To put it on the website, open Inventory in the admin panel and click Publish.").
- Updating or deleting an internal draft: use update_listing when Kapil corrects a saved property; use delete_listing only after he clearly confirms deletion.
- TWO SYSTEMS: Chariot keeps an internal (private) inventory and a website (public) inventory separate. Tools create_listing/update_listing/delete_listing/search_listings/search_requirements/search_leads only touch the INTERNAL side. Nothing you do can or should put a property on the public Chariot website — that only happens via the Inventory tab in the admin panel.
- Never claim something is live on the Chariot website unless you have confirmed it was published there.`;

const BUSINESS_RULES = `

CHARIOT BUSINESS MODEL
- The private typed tables are the broker's working source of truth. They cover residential/commercial listings and requirements, split by sale/rent, plus website enquiries in chariot_leads.
- The public website source is chariot_properties. A private typed-table result is not automatically a public listing and must never be described as live on the website.
- Public inventory workflow: draft means editable and not live; approved means reviewed and ready to publish; published means live on the website; archived means removed from active use. Do not call a draft or approved property live.
- Internal listing workflow follows the same draft/approved/published/archived lifecycle, but internal visibility is still private. Status and visibility are separate concepts.
- The Inventory tab is the authority for public publishing. The assistant may save or update a private draft, but it must not publish, unpublish, or claim to have published a website property.

SEARCH AND ANSWER RULES
- If a request does not distinguish sale from rent, use sale only when the wording clearly implies buying; otherwise ask whether the user means sale or rent.
- If a request does not distinguish residential from commercial, infer it only when the wording is explicit (BHK/flat/home = residential; office/shop/workspace = commercial); otherwise ask.
- Treat locality, micro-market, and property/building names as search terms, not guaranteed exact matches. Say what filters were used when useful.
- For inventory summaries, search the current internal listings with no locality filter and report only returned rows. Never fill gaps from memory, sample data, the public site, or PropAI.
- For buyer-property matching, use the matching tool or search both the relevant requirement and listing tables. Return a fit score and the actual reasons for the match; a match is a shortlist, not a promise of availability or suitability.
- For lead questions, search chariot_leads. A lead's phone number is a lead contact, not a broker/property contact. Do not label it as the broker's number.
- Listing records do not currently provide a broker phone field. If asked for a broker number, say it is not stored on the listing and offer the configured Chariot contact only if it is explicitly available from the system.
- If records conflict or fields are missing, state the exact uncertainty and do not choose a value silently.
- Only offer actions that exist: search again, show more matches, save a private draft, update a private draft, check enquiries, or use the Inventory workflow. Do not offer favourites, bookings, viewings, reminders, sending, or other actions unless a corresponding tool exists and has completed.

LEADS AND PRIVACY
- Website enquiries contain personal contact information. Show lead phone numbers only in this authenticated private admin context and only when relevant to the request.
- Do not expose private inventory, lead data, broker notes, or internal IDs as public-site content.

WHATSAPP OPERATIONS
- WhatsMeow is the private WhatsApp transport for the configured broker self-chat. It is not a public recipient directory and must not send to arbitrary numbers.
- Pairing, connection state, and the configured self-chat phone are operational details. Do not claim WhatsApp is connected or a message was sent unless the gateway confirms it.
- Publishing through WhatsApp remains a draft/review workflow. A message such as “post it” is a publishing confirmation only when the gateway and Chariot workflow explicitly recognize it; otherwise ask for confirmation.
- Raw WhatsApp messages are the source of truth for WhatsApp-sourced leads. Only the last 30 days are retained and searchable. If a search returns nothing, say no matching messages were found in the retained window — do not guess at older messages.
- ON-DEMAND EXTRACTION: a WhatsApp message becomes a structured record only when Kapil asks for it. First call search_whatsapp_messages, then call extract_whatsapp_listing with that message's id. Never call extract_whatsapp_listing for every message a search returns, and never extract without an explicit request.
- One message can be extracted once per table. If extract_whatsapp_listing reports already_extracted, do not create another listing; show Kapil the existing draft instead.
- An extracted listing is an INTERNAL draft with source "whatsapp" that stays linked to the raw message it came from. Report what was extracted and the source (group, sender, message time) in one line, and say it needs review in the admin Inventory tab.
- Extraction never publishes. An extracted draft is private, unverified, and not live on the website until Kapil reviews and publishes it in the admin Inventory tab.

SOURCE AND PROVENANCE
- When asked where an answer came from, re-check the relevant live tool/database and identify the actual source: internal typed listings, chariot_leads, requirements, or public chariot_properties. Never invent a source and never retract a verified result merely because the prior tool result is not in the visible conversation history.
`;

type SarvamToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

type SarvamMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: SarvamToolCall[];
  tool_call_id?: string;
};

type SarvamResponse = {
  choices?: Array<{
    message: { content: string | null; tool_calls?: SarvamToolCall[] };
    finish_reason?: string;
  }>;
  error?: { message: string };
};

type SearchArgs = {
  category?: string;
  transaction?: string;
  locality?: string;
  min_price?: number;
  max_price?: number;
  bhk?: number;
  limit?: number;
};

type MatchArgs = SearchArgs & { requirement_id?: number };

type CopyRequest = {
  category: "residential" | "commercial";
  transaction: "sale" | "rent";
};

const LISTING_TABLE: Record<string, string> = {
  "residential/sale": "chariot_residential_sale_listings",
  "residential/rent": "chariot_residential_rent_listings",
  "commercial/sale": "chariot_commercial_sale_listings",
  "commercial/rent": "chariot_commercial_rent_listings",
};

const REQUIREMENT_TABLE = {
  "residential/sale": "chariot_residential_sale_requirements",
  "residential/rent": "chariot_residential_rent_requirements",
  "commercial/sale": "chariot_commercial_sale_requirements",
  "commercial/rent": "chariot_commercial_rent_requirements",
} as Record<string, string>;

const LISTING_PROPERTIES = {
  name: { type: "string", description: "Property/building name, or a short title. Required." },
  category: { type: "string", enum: ["residential", "commercial"], description: "Default residential." },
  transaction: { type: "string", enum: ["sale", "rent"], description: "Default sale." },
  locality: { type: "string", description: "Locality e.g. Bandra West. Required." },
  micro_market: { type: "string", description: "Micro-market e.g. Bandra West." },
  summary_title: { type: "string", description: "Short headline for the listing, default to the name." },
  bhk: { type: "number", description: "Number of bedrooms for residential (1, 2, 3...)." },
  configuration_type: { type: "string", description: "e.g. '2 BHK - 1 Hall - 2 Bathroom'." },
  carpet_area_sqft: { type: "number", description: "Carpet area in sq ft." },
  total_asking_price: { type: "number", description: "Asking price in ₹ for a sale listing (total)." },
  monthly_rent: { type: "number", description: "Monthly rent in ₹ for a rental listing." },
  price_raw_text: { type: "string", description: "How Kapil said the price, e.g. '₹3.2 crore' or '85k/month'." },
  furnishing_status: { type: "string", description: "e.g. Semi-Furnished, Furnished, Unfurnished." },
  possession_status: { type: "string", description: "e.g. Ready to move, Dec 2026." },
  car_parking_count: { type: "number", description: "Car parking count." },
  description: { type: "string", description: "Extra notes Kapil gave (view, amenities, pets, terms)." },
} as const;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "match_properties",
      description:
        "Find the best internal property matches for a buyer or tenant requirement. Use for requests like 'find a 2 BHK for a Bandra buyer under ₹4 crore' or 'match current requirements to inventory'. Return actual records with a fit score; never invent a match.",
      parameters: {
        type: "object",
        properties: {
          category: { type: "string", enum: ["residential", "commercial"] },
          transaction: { type: "string", enum: ["sale", "rent"] },
          locality: { type: "string" },
          min_price: { type: "number" },
          max_price: { type: "number" },
          bhk: { type: "number" },
          limit: { type: "number" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_listings",
      description:
        "Search Chariot's typed property listings (residential/commercial; sale/rent). Use for queries like \"3 BHK in Bandra under ₹4 crore\" or \"office for rent in BKC\".",
      parameters: {
        type: "object",
        properties: {
          category: { type: "string", enum: ["residential", "commercial"], description: "Default residential if unclear." },
          transaction: { type: "string", enum: ["sale", "rent"], description: "Default sale if unclear." },
          locality: { type: "string", description: "Locality or micro-market name, e.g. Bandra, BKC, Powai." },
          min_price: { type: "number", description: "Minimum asking price (sale) or monthly rent (rent) in ₹." },
          max_price: { type: "number", description: "Maximum asking price (sale) or monthly rent (rent) in ₹." },
          bhk: { type: "number", description: "Number of bedrooms for residential (1, 2, 3...)." },
          limit: { type: "number", description: "Max rows to return (default 5)." },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "extract_whatsapp_listing",
      description:
        "On-demand extraction: turn ONE raw WhatsApp message (an id from search_whatsapp_messages) into a private INTERNAL draft listing linked to that message. Call this ONLY when Kapil explicitly asks to save/extract/turn a specific WhatsApp message into a listing — never for every message a search returns. The message text is already provided by the search result; extract the structured fields from it, never invent them. Fails safely if the message was already extracted.",
      parameters: {
        type: "object",
        properties: {
          raw_message_id: { type: "number", description: "id of the raw WhatsApp message from search_whatsapp_messages. Required." },
          ...LISTING_PROPERTIES,
        },
        required: ["raw_message_id", "name", "locality"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_requirements",
      description:
        "Search Chariot's typed buyer/tenant requirements (what clients asked for). Use for queries like \"anyone looking for an office in Lower Parel\".",
      parameters: {
        type: "object",
        properties: {
          category: { type: "string", enum: ["residential", "commercial"] },
          transaction: { type: "string", enum: ["sale", "rent"] },
          locality: { type: "string", description: "Locality or micro-market name the client wants." },
          limit: { type: "number", description: "Max rows to return (default 5)." },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_whatsapp_messages",
      description:
        "Search Chariot's retained WhatsApp self-chat and group messages. Use this when Kapil asks for listings, requirements, prices, or messages from WhatsApp, WhatsApp groups, raw messages, ingested messages, or the message archive. These are raw source messages from the last 30 days, not confirmed public listings; clearly label them as WhatsApp-sourced leads or opportunities.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Words to find in message text, sender phone, or group name. Use the most useful property/locality terms." },
          limit: { type: "number", description: "Maximum number of raw messages to return, from 1 to 20." },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_leads",
      description:
        "Search Chariot's website leads (people who enquired about a property on the website). Use for \"recent enquiries\" or \"anyone asking about Bandra\".",
      parameters: {
        type: "object",
        properties: {
          locality: { type: "string", description: "Property/locality the lead asked about." },
          limit: { type: "number", description: "Max rows to return (default 5)." },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_listing",
      description:
        "Create a new INTERNAL (private) property draft in Kapil's inventory when he dictates one (e.g. \"2 BHK in Bandra West, 1100 sqft, ₹3.2 crore, semi-furnished, sea view\"). Internal drafts are private to Chariot — they never show on the website. Only call this when the user is dictating a NEW property.",
      parameters: {
        type: "object",
        properties: LISTING_PROPERTIES,
        required: ["name", "locality"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_listing",
      description:
        "Update an existing INTERNAL (private) listing Kapil already saved. He says e.g. \"my Khar 2 BHK — the price is now ₹3.6 crore\" or \"call it Sea Pearl instead\". Use the id from a previous search. Fields given are replaced; id and category/transaction decide which table.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "number", description: "Listing id from a previous search/create. Required." },
          category: { type: "string", enum: ["residential", "commercial"] },
          transaction: { type: "string", enum: ["sale", "rent"] },
          building_name: { type: "string" },
          locality: { type: "string" },
          micro_market: { type: "string" },
          summary_title: { type: "string" },
          bhk: { type: "number" },
          configuration_type: { type: "string" },
          carpet_area_sqft: { type: "number" },
          total_asking_price: { type: "number" },
          monthly_rent: { type: "number" },
          price_raw_text: { type: "string" },
          furnishing_status: { type: "string" },
          possession_status: { type: "string" },
          car_parking_count: { type: "number" },
          description: { type: "string", description: "Appends as a broker note (plain text)." },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_listing",
      description:
        "Delete an INTERNAL listing Kapil explicitly wants removed. Only call AFTER Kapil clearly confirms he wants it deleted (e.g. \"yes delete it\"). id from a previous search/create.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "number", description: "Internal listing id to delete. Required." },
          category: { type: "string", enum: ["residential", "commercial"] },
          transaction: { type: "string", enum: ["sale", "rent"] },
        },
        required: ["id"],
      },
    },
  },
];

function config() {
  return {
    apiKey: process.env.SARVAM_API_KEY || "",
    supabaseUrl: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    whatsappBrokerId: process.env.CHARIOT_WHATSAPP_BROKER_ID || "",
  };
}

function suppressArchived(table: string) {
  return table.endsWith("_listings") || table.endsWith("_requirements")
    ? `&status=not.eq.archived`
    : "";
}

async function restSelect(path: string) {
  const { supabaseUrl, serviceKey } = config();
  const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/${path}`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Database search returned ${response.status}`);
  const rows = await response.json() as Array<Record<string, unknown>>;
  return rows;
}

async function restPost(path: string, body: Record<string, unknown>) {
  const { supabaseUrl, serviceKey } = config();
  const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/${path}`, {
    method: "POST",
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || `Database write returned ${response.status}`);
  }
  const rows = await response.json() as Array<Record<string, unknown>>;
  return rows[0] ?? null;
}

function pick(row: Record<string, unknown>, table: string) {
  const name = (row.building_name as string) || (row.summary_title as string) || (row.locality_raw as string) || "Unnamed";
  const priceField = table.includes("_listings")
    ? table.includes("_rent_")
      ? row.monthly_rent
      : row.total_asking_price
    : `${row.budget_min ?? "?"}–${row.budget_max ?? "?"}`;
  return {
    name,
    locality: (row.locality_raw as string) || (row.locality_resolved as string) || (row.micro_market as string) || "",
    price: priceField ?? null,
    area: (row.carpet_area_sqft ?? row.area_min_sqft ?? row.built_up_area_sqft ?? null) as number | null,
    bhk: (row.bhk ?? row.bhk_options ?? null) as number | string | null,
    status: (row.status as string) || "",
    details: (row.summary_title as string) || "",
  };
}

async function searchListings(args: SearchArgs): Promise<string> {
  const category = args.category || "residential";
  const transaction = args.transaction || "sale";
  const table = LISTING_TABLE[`${category}/${transaction}`];
  if (!table) return JSON.stringify({ results: [] });

  const parts = [`select=*`, `order=created_at.desc`, `limit=${Math.min(args.limit ?? 5, 10)}`];
  parts.push(suppressArchived(table));
  parts.push(`visibility=eq.internal`);
  if (args.locality) {
    parts.push(`or=(locality_raw.ilike.*${encodeURIComponent(args.locality)}*,locality_resolved.ilike.*${encodeURIComponent(args.locality)}*,micro_market.ilike.*${encodeURIComponent(args.locality)}*,summary_title.ilike.*${encodeURIComponent(args.locality)}*)`);
  }
  const priceCol = table.includes("_rent_") ? "monthly_rent" : "total_asking_price";
  if (typeof args.min_price === "number") parts.push(`${priceCol}=gte.${args.min_price}`);
  if (typeof args.max_price === "number") parts.push(`${priceCol}=lte.${args.max_price}`);
  if (typeof args.bhk === "number") parts.push(`bhk=eq.${args.bhk}`);

  const rows = await restSelect(`${table}?${parts.join("&")}`);
  const results = rows.slice(0, args.limit ?? 5).map((row) => pick(row, table));
  return JSON.stringify({ results });
}

async function matchProperties(args: MatchArgs): Promise<string> {
  const category = args.category || "residential";
  const transaction = args.transaction || "sale";
  const table = LISTING_TABLE[`${category}/${transaction}`];
  if (!table) return JSON.stringify({ results: [] });

  const parts = [`select=*`, `order=created_at.desc`, `limit=50`, `visibility=eq.internal`, suppressArchived(table)];
  const priceCol = table.includes("_rent_") ? "monthly_rent" : "total_asking_price";
  if (typeof args.max_price === "number") parts.push(`${priceCol}=lte.${args.max_price}`);
  if (typeof args.min_price === "number") parts.push(`${priceCol}=gte.${args.min_price}`);
  const rows = await restSelect(`${table}?${parts.filter(Boolean).join("&")}`);
  const requestedLocality = args.locality?.toLowerCase().trim();
  const scored = rows.map((row) => {
    const locality = String(row.locality_raw || row.locality_resolved || row.micro_market || "");
    const localityMatch = Boolean(requestedLocality && locality.toLowerCase().includes(requestedLocality));
    const bhkMatch = typeof args.bhk === "number" && Number(row.bhk) === args.bhk;
    const price = Number(row[priceCol]);
    const budgetMatch = Number.isFinite(price) && (typeof args.min_price !== "number" || price >= args.min_price) && (typeof args.max_price !== "number" || price <= args.max_price);
    const score = (requestedLocality ? (localityMatch ? 40 : 0) : 20) + (typeof args.bhk === "number" ? (bhkMatch ? 35 : 0) : 20) + (typeof args.max_price === "number" || typeof args.min_price === "number" ? (budgetMatch ? 25 : 0) : 20);
    const reasons = [localityMatch && `locality matches ${args.locality}`, bhkMatch && `${args.bhk} BHK`, budgetMatch && "within budget"].filter(Boolean);
    return { ...pick(row, table), match_score: score, why: reasons.length ? reasons.join(", ") : "closest available internal listing" };
  }).sort((a, b) => b.match_score - a.match_score || String(a.name).localeCompare(String(b.name)));
  return JSON.stringify({ results: scored.slice(0, Math.min(args.limit ?? 5, 10)) });
}

async function searchWhatsappMessages(args: { query?: string; limit?: number }): Promise<string> {
  const { supabaseUrl, serviceKey, whatsappBrokerId } = config();
  if (!supabaseUrl || !serviceKey || !whatsappBrokerId) return JSON.stringify({ results: [], error: "Chariot WhatsApp storage is not configured" });
  const limit = Math.min(args.limit ?? 10, 20);
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const parts = [
    "select=id,message,message_type,sender,sender_phone,group_name,is_group,message_timestamp,created_at",
    `broker_id=eq.${encodeURIComponent(whatsappBrokerId)}`,
    `created_at=gte.${encodeURIComponent(cutoff)}`,
    // The device emits plenty of protocol/media-sync events with no text. They
    // are kept in the raw store for the record but would otherwise crowd out the
    // actual messages Kapil is asking about.
    "message=neq.",
    "order=message_timestamp.desc",
    `limit=${limit}`,
  ];
  if (args.query?.trim()) {
    const query = encodeURIComponent(args.query.trim());
    parts.push(`or=(message.ilike.*${query}*,sender_phone.ilike.*${query}*,group_name.ilike.*${query}*)`);
  }
  const rows = await restSelect(`chariot_whatsapp_messages?${parts.join("&")}`);
  return JSON.stringify({
    results: rows,
    retention: "Only the last 30 days are searchable.",
    extraction: "Extraction is on demand only. To turn one of these messages into a private draft, call extract_whatsapp_listing with that result's id — and only when Kapil asked for it.",
  });
}

async function searchRequirements(args: SearchArgs): Promise<string> {
  const category = args.category || "residential";
  const transaction = args.transaction || "sale";
  const table = REQUIREMENT_TABLE[`${category}/${transaction}`];
  if (!table) return JSON.stringify({ results: [] });

  const parts = [`select=*`, `order=created_at.desc`, `limit=${Math.min(args.limit ?? 5, 10)}`];
  parts.push(suppressArchived(table));
  parts.push(`visibility=eq.internal`);
  if (args.locality) {
    parts.push(`or=(locality_raw.ilike.*${encodeURIComponent(args.locality)}*,locality_resolved.ilike.*${encodeURIComponent(args.locality)}*,micro_market.ilike.*${encodeURIComponent(args.locality)}*,locality_options.cs.{"${encodeURIComponent(args.locality)}"})`);
  }
  if (typeof args.min_price === "number") parts.push(`budget_max=gte.${args.min_price}`);
  if (typeof args.max_price === "number") parts.push(`budget_min=lte.${args.max_price}`);
  if (typeof args.bhk === "number") parts.push(`bhk=eq.${args.bhk}`);

  const rows = await restSelect(`${table}?${parts.join("&")}`);
  const results = rows.slice(0, args.limit ?? 5).map((row) => pick(row, table));
  return JSON.stringify({ results });
}

async function searchLeads(args: { locality?: string; limit?: number }): Promise<string> {
  const parts = [`select=*`, `order=created_at.desc`, `limit=${Math.min(args.limit ?? 5, 10)}`];
  if (args.locality) parts.push(`or=(locality.ilike.*${encodeURIComponent(args.locality)}*,intent.ilike.*${encodeURIComponent(args.locality)}*)`);
  const rows = await restSelect(`chariot_leads?${parts.join("&")}`);
  const results = rows.slice(0, args.limit ?? 5).map((row) => ({
    name: row.name,
    phone: row.phone,
    intent: row.intent,
    locality: row.locality,
    source: row.source,
    created_at: row.created_at,
  }));
  return JSON.stringify({ results });
}

function stubBuilder(table: string, category: string): Record<string, unknown> {
  return table.includes("_commercial_")
    ? { permitted_use_types: [] }
    : { building_amenities: [], unit_amenities: [] };
}

function listingTable(category: string, transaction: string) {
  return LISTING_TABLE[`${category}/${transaction}`] || null;
}

function noRow(message: string): string {
  return JSON.stringify({ error: message });
}

async function createListing(args: Record<string, unknown>): Promise<string> {
  const name = String(args.name || "").trim();
  const locality = String(args.locality || "").trim();
  if (!name || !locality) return noRow("Listing needs at least a name and a locality.");

  const category = String(args.category || "residential");
  const transaction = String(args.transaction || "sale");
  const table = listingTable(category, transaction);
  if (!table) return noRow(`I don't support ${category}/${transaction} yet.`);

  const rawMessageId = Number(args.raw_message_id);
  const hasProvenance = Number.isFinite(rawMessageId) && rawMessageId > 0;
  const payload: Record<string, unknown> = {
    ...stubBuilder(table, category),
    asset_type: category,
    transaction_type: transaction,
    building_name: name,
    locality_raw: locality,
    locality_resolved: locality,
    micro_market: args.micro_market || locality,
    summary_title: args.summary_title || name,
    visibility: "internal",
    status: "draft",
    source: typeof args.source === "string" && args.source.trim() ? args.source.trim() : "agent",
  };
  if (hasProvenance) payload.raw_message_id = rawMessageId;
  if (args.ai_extraction && typeof args.ai_extraction === "object") payload.ai_extraction = args.ai_extraction;
  if (table.includes("_commercial_") && args.commercial_use_type) payload.commercial_use_type = String(args.commercial_use_type);
  if (!table.includes("_commercial_") && typeof args.bhk === "number") payload.bhk = args.bhk;
  if (args.configuration_type) payload.configuration_type = String(args.configuration_type);
  if (typeof args.carpet_area_sqft === "number") {
    payload.carpet_area_sqft = args.carpet_area_sqft;
    payload.area_raw_text = `${args.carpet_area_sqft} sqft`;
  }
  if (transaction === "rent") {
    if (typeof args.monthly_rent === "number") payload.monthly_rent = args.monthly_rent;
  } else if (typeof args.total_asking_price === "number") {
    payload.total_asking_price = args.total_asking_price;
  }
  if (args.price_raw_text) payload.price_raw_text = String(args.price_raw_text);
  if (args.furnishing_status) payload.furnishing_status = String(args.furnishing_status);
  if (args.possession_status) payload.possession_status = String(args.possession_status);
  if (typeof args.car_parking_count === "number") payload.car_parking_count = args.car_parking_count;
  if (args.description) payload.broker_notes = [{ note: String(args.description) }];

  try {
    const created = await insertListingRow(table, payload);
    return JSON.stringify({ ok: true, id: created?.id, name, locality, status: "draft", table, kind: "internal" });
  } catch (error) {
    return JSON.stringify({ error: error instanceof Error ? error.message : "Could not create listing" });
  }
}

// insertListingRow writes a draft, tolerating a database that has not applied the
// WhatsApp provenance columns yet. Losing provenance is recoverable; refusing to
// save Kapil's dictated listing is not.
async function insertListingRow(table: string, payload: Record<string, unknown>) {
  try {
    return await restPost(table, payload);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    const missingProvenance = !("raw_message_id" in payload) || !/raw_message_id|ai_extraction|schema cache/i.test(detail);
    if (missingProvenance) throw error;
    const withoutProvenance = { ...payload };
    delete withoutProvenance.raw_message_id;
    delete withoutProvenance.ai_extraction;
    return restPost(table, withoutProvenance);
  }
}

async function extractWhatsappListing(args: Record<string, unknown>): Promise<string> {
  const { supabaseUrl, serviceKey, whatsappBrokerId } = config();
  if (!supabaseUrl || !serviceKey || !whatsappBrokerId) return noRow("Chariot WhatsApp storage is not configured.");

  const rawMessageId = Number(args.raw_message_id);
  if (!Number.isFinite(rawMessageId) || rawMessageId <= 0) {
    return noRow("I need the id of the WhatsApp message to extract. Search the messages first and use the id from those results.");
  }

  const sourceRows = await restSelect(
    `chariot_whatsapp_messages?select=id,message,message_type,sender,sender_phone,group_name,is_group,message_timestamp&broker_id=eq.${encodeURIComponent(whatsappBrokerId)}&id=eq.${rawMessageId}&limit=1`,
  );
  const source = sourceRows[0];
  if (!source) {
    return noRow(`WhatsApp message ${rawMessageId} is not in Chariot's raw store. It may be older than the 30-day retention window — search the messages again for a current id.`);
  }

  const category = String(args.category || "residential");
  const transaction = String(args.transaction || "sale");
  const table = listingTable(category, transaction);
  if (!table) return noRow(`I don't support ${category}/${transaction} listings yet.`);

  const existing = await restSelect(`${table}?select=id,building_name,status&raw_message_id=eq.${rawMessageId}&limit=1`);
  if (existing.length) {
    return JSON.stringify({
      ok: true,
      already_extracted: true,
      id: existing[0].id,
      name: existing[0].building_name,
      status: existing[0].status,
      table,
      raw_message_id: rawMessageId,
      note: "This WhatsApp message was already extracted. Nothing new was created — show Kapil the existing draft.",
    });
  }

  const fields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) {
    if (key === "raw_message_id" || value === undefined || value === null || value === "") continue;
    fields[key] = value;
  }
  const sourceText = String(source.message || "").slice(0, 4000);
  const sourceLabel = [
    source.is_group ? `group ${source.group_name || "unknown"}` : "direct chat",
    source.sender || "unknown sender",
    source.sender_phone ? `(${source.sender_phone})` : "",
    source.message_timestamp ? `at ${source.message_timestamp}` : "",
  ].filter(Boolean).join(" · ");

  const extraction = {
    extracted_at: new Date().toISOString(),
    extracted_by: SARVAM_MODEL,
    tool: "extract_whatsapp_listing",
    source_message_id: rawMessageId,
    source_label: sourceLabel,
    source_text: sourceText,
    source_message_type: String(source.message_type || ""),
    fields,
  };

  const description = typeof args.description === "string" && args.description.trim()
    ? args.description.trim()
    : `From WhatsApp (${sourceLabel}): ${sourceText}`.slice(0, 1000);

  const created = JSON.parse(await createListing({
    ...args,
    description,
    source: "whatsapp",
    raw_message_id: rawMessageId,
    ai_extraction: extraction,
  })) as Record<string, unknown>;
  if (created.error) return JSON.stringify(created);

  return JSON.stringify({ ...created, raw_message_id: rawMessageId, source: "whatsapp", extracted_from: sourceLabel, source_text: sourceText, review: "Private draft. Review it in the admin Inventory tab before publishing." });
}

async function updateListing(args: Record<string, unknown>): Promise<string> {
  const id = Number(args.id);
  const category = String(args.category || "residential");
  const transaction = String(args.transaction || "sale");
  const table = listingTable(category, transaction);
  if (!Number.isFinite(id) || !table) return noRow("I need the listing id to update it.");
  if (!(await rowExists(table, id))) return noRow(`I couldn't find listing ${id} to update.`);

  const payload: Record<string, unknown> = {};
  const copy = [
    "building_name", "locality_raw", "micro_market", "summary_title", "configuration_type",
    "price_raw_text", "furnishing_status", "possession_status",
  ];
  for (const key of copy) {
    const value = args[key];
    if (typeof value === "string" && value.trim()) payload[key] = value.trim();
  }
  if (typeof args.locality === "string" && args.locality.trim()) {
    payload.locality_raw = String(args.locality).trim();
    payload.locality_resolved = String(args.locality).trim();
  }
  for (const key of ["bhk", "carpet_area_sqft", "car_parking_count"]) {
    if (typeof args[key] === "number") payload[key] = args[key];
  }
  if (transaction === "rent") {
    if (typeof args.monthly_rent === "number") payload.monthly_rent = args.monthly_rent;
  } else if (typeof args.total_asking_price === "number") {
    payload.total_asking_price = args.total_asking_price;
  }
  if (typeof args.carpet_area_sqft === "number") payload.area_raw_text = `${args.carpet_area_sqft} sqft`;
  if (args.description && String(args.description).trim()) {
    payload.broker_notes = [{ note: String(args.description).trim() }];
  }

  if (Object.keys(payload).length === 0) return noRow("Nothing to update — tell me what changed.");

  try {
    await restPatch(`id=eq.${id}`, table, payload);
    return JSON.stringify({ ok: true, id, updated: Object.keys(payload) });
  } catch (error) {
    return JSON.stringify({ error: error instanceof Error ? error.message : "Could not update listing" });
  }
}

async function deleteListing(args: Record<string, unknown>): Promise<string> {
  const id = Number(args.id);
  const table = listingTable(String(args.category || "residential"), String(args.transaction || "sale"));
  if (!Number.isFinite(id) || !table) return noRow("I need the listing id to delete it.");
  if (!(await rowExists(table, id))) return noRow(`I couldn't find listing ${id} to delete.`);

  try {
    await restDelete(`id=eq.${id}`, table);
    return JSON.stringify({ ok: true, id, deleted: true });
  } catch (error) {
    return JSON.stringify({ error: error instanceof Error ? error.message : "Could not delete listing" });
  }
}

async function rowExists(table: string, id: number): Promise<boolean> {
  try {
    const rows = await restSelect(`${table}?select=id&id=eq.${id}`);
    return rows.length > 0;
  } catch {
    return false;
  }
}

async function restPatch(filter: string, table: string, body: Record<string, unknown>) {
  const { supabaseUrl, serviceKey } = config();
  const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/${table}?${filter}`, {
    method: "PATCH",
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || `Database update returned ${response.status}`);
  }
}

async function restDelete(filter: string, table: string) {
  const { supabaseUrl, serviceKey } = config();
  const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/${table}?${filter}`, {
    method: "DELETE",
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Prefer: "return=representation" },
    cache: "no-store",
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || `Database delete returned ${response.status}`);
  }
}

async function runTool(name: string, rawArgs: string): Promise<string> {
  const args = JSON.parse(rawArgs) as Record<string, unknown>;
  switch (name) {
    case "search_listings":
      return searchListings(args as SearchArgs);
    case "match_properties":
      return matchProperties(args as MatchArgs);
    case "search_whatsapp_messages":
      return searchWhatsappMessages(args as { query?: string; limit?: number });
    case "extract_whatsapp_listing":
      return extractWhatsappListing(args);
    case "search_requirements":
      return searchRequirements(args as SearchArgs);
    case "search_leads":
      return searchLeads(args as { locality?: string; limit?: number });
    case "create_listing":
      return createListing(args);
    case "update_listing":
      return updateListing(args);
    case "delete_listing":
      return deleteListing(args);
    default:
      return JSON.stringify({ error: `Unknown tool ${name}` });
  }
}

async function callSarvam(messages: SarvamMessage[], toolChoice?: string): Promise<SarvamResponse> {
  const { apiKey } = config();
  if (!apiKey) throw new Error("Sarvam API key is not configured");

  const response = await fetch(SARVAM_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-subscription-key": apiKey,
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: SARVAM_MODEL,
      messages,
      tools: TOOLS,
      ...(toolChoice ? { tool_choice: { type: "function", function: { name: toolChoice } } } : {}),
      temperature: 0.4,
    }),
    cache: "no-store",
  });
  const body = await response.json() as SarvamResponse;
  if (!response.ok) {
    const detail = body.error?.message || `Sarvam returned ${response.status}`;
    throw new Error(detail);
  }
  return body;
}

function buildMessages(text: string, history: AgentMessage[]): SarvamMessage[] {
  const recent = history.slice(-8);
  return [
    { role: "system", content: SYSTEM_PROMPT },
    ...recent.map((turn) =>
      turn.role === "user"
        ? { role: "user" as const, content: turn.text }
        : { role: "assistant" as const, content: turn.text }
    ),
    { role: "user", content: text },
  ];
}

function asksForPreviousSource(text: string) {
  return /\b(where did (that|this|those) come from|where is (that|this) from|what(?:'s| is) the source|how did you get (that|this)|which database)\b/i.test(text);
}

function forcedToolFor(text: string): string | undefined {
  if (/\b(enquir\w*|lead|contacted|asked about|who.*website)\b/i.test(text)) return "search_leads";
  if (/\b(extract|turn (this|that|it) into a listing|convert (this|that|it) to a listing|save (this|that|it) as a listing|save (this|that|it) from whatsapp)\b/i.test(text)) return "extract_whatsapp_listing";
  if (/\b(whatsapp|self[- ]chat|raw messages?|raw listing|ingest|ingested|message archive|group messages?|from (?:a|the) whatsapp group)\b/i.test(text)) return "search_whatsapp_messages";
  if (/\b(match|matched|fit|suitable|shortlist|find\b.*\b(properties|listings)\b.*\b(buyer|tenant)|properties?\s+for\s+(a\s+)?(buyer|tenant)|listings?\s+for\s+(a\s+)?(buyer|tenant))\b/i.test(text)) return "match_properties";
  // "find a 2 BHK for a Bandra buyer" is a matching request even without the
  // word "properties", unless the wording is really a requirements lookup.
  if (/\b(find|show|search|shortlist)\w*\b.{0,40}\bfor\b.{0,25}\b(buyer|tenant)\b/i.test(text) && !/\b(requirement|looking for|anyone|seeking|client wants)\b/i.test(text)) return "match_properties";
  if (/\b(requirement|looking for|buyer|tenant|client wants|seeking)\b/i.test(text)) return "search_requirements";
  if (/\b(save|store|add|new property|new listing)\b/i.test(text)) return "create_listing";
  if (/\b(inventory|listing|property|properties|available|bhk|flat|apartment|office|villa|summari[sz]e)\b/i.test(text)) return "search_listings";
  return undefined;
}

export async function askAgent(text: string, history: AgentMessage[] = []): Promise<{ reply: string }> {
  const messages = [{ role: "system" as const, content: BUSINESS_RULES }, ...buildMessages(text, history)];
  const forcedTool = forcedToolFor(text);
  if (asksForPreviousSource(text) && history.some((message) => message.role === "agent")) {
    try {
      const currentInventory = await searchListings({ limit: 10 });
      messages.push({
        role: "system",
        content: `Source verification requested. Re-check Chariot's current private inventory before answering. The live search returned: ${currentInventory}. Explain the source accurately and do not rely only on the previous assistant wording.`,
      });
    } catch {
      messages.push({
        role: "system",
        content: "Source verification requested. Explain that the previous answer should be verified against the current private inventory, and do not invent a source or deny access without checking.",
      });
    }
  }

  for (let round = 0; round < 4; round++) {
    const completion = await callSarvam(messages, round === 0 ? forcedTool : undefined);
    const choice = completion.choices?.[0];
    if (!choice) {
      const detail = completion.error?.message || "No answer from the assistant";
      throw new Error(detail);
    }
    const message = choice.message;

    if (message.tool_calls && message.tool_calls.length > 0) {
      messages.push({ role: "assistant", content: null, tool_calls: message.tool_calls });
      for (const call of message.tool_calls) {
        try {
          const result = await runTool(call.function.name, call.function.arguments || "{}");
          messages.push({ role: "tool", content: result, tool_call_id: call.id });
        } catch (error) {
          messages.push({ role: "tool", content: JSON.stringify({ error: error instanceof Error ? error.message : "Tool failed" }), tool_call_id: call.id });
        }
      }
      continue;
    }

    const reply = (message.content || "").trim();
    if (!reply) throw new Error("The assistant returned an empty answer");
    return { reply };
  }

  throw new Error("The assistant took too long to answer");
}
