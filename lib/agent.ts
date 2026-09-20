export type AgentMessage = { role: "user" | "agent"; text: string };

const SARVAM_MODEL = "sarvam-105b";
const SARVAM_URL = "https://api.sarvam.ai/v1/chat/completions";

const SYSTEM_PROMPT = `You are Kapil's Chariot Realty assistant — a calm, friendly real-estate helper, not a chatbot demo. Kapil is a busy property owner; he is not a technical person and does not read long menus or jargon.

HOW TO ANSWER
- Speak plainly, in short sentences. No API names, no "system", no JSON.
- When Kapil asks for listings, requirements, or lead enquiries, use the search tools to look these up in his own database, then give him the top 2–4 most relevant results with: name/area, price, and 1 short line of why it fits.
- If the correct answer needs a decision, give him a simple choice with a clear next step, e.g. "Say 1 to see 3 more, or 2 to save this one."
- When Kapil dictates a property or a lead, repeat back the key details (area, price, who, when) in one or two lines and confirm you saved it — he wants reassurance.
- Never invent data. If the tools return nothing, say "I don't have that yet" and offer the closest real match or ask him for the details to save.

ACTION CONFIRMATION
- When Kapil dictates a new property, save it as a draft with create_listing. This writes to Chariot's INTERNAL inventory — private, never shown on the website. Confirm in one line ("Saved as a draft: 2 BHK, Bandra West, ₹3.2 crore. To put it on the website, open Inventory in the admin panel and click Publish.").
- Updating or deleting an internal draft: use update_listing when Kapil corrects a saved property; use delete_listing only after he clearly confirms deletion.
- TWO SYSTEMS: Chariot keeps an internal (private) inventory and a website (public) inventory separate. Tools create_listing/update_listing/delete_listing/search_listings/search_requirements/search_leads only touch the INTERNAL side. Nothing you do can or should put a property on the public Chariot website — that only happens via the Inventory tab in the admin panel.
- Never claim something is live on the Chariot website unless you have confirmed it was published there.`;

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

const TOOLS = [
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
        properties: {
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
        },
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
    source: "agent",
  };
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
    const created = await restPost(table, payload);
    return JSON.stringify({ ok: true, id: created?.id, name, locality, status: "draft", table, kind: "internal" });
  } catch (error) {
    return JSON.stringify({ error: error instanceof Error ? error.message : "Could not create listing" });
  }
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

async function callSarvam(messages: SarvamMessage[]): Promise<SarvamResponse> {
  const { apiKey } = config();
  if (!apiKey) throw new Error("Sarvam API key is not configured");

  const response = await fetch(SARVAM_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-subscription-key": apiKey,
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: SARVAM_MODEL, messages, tools: TOOLS, temperature: 0.4 }),
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

export async function askAgent(text: string, history: AgentMessage[] = []): Promise<{ reply: string }> {
  const messages = buildMessages(text, history);

  for (let round = 0; round < 4; round++) {
    const completion = await callSarvam(messages);
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
