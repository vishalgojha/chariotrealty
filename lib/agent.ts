export type AgentMessage = { role: "user" | "agent"; text: string };

const SARVAM_MODEL = "sarvam-105b";
const SARVAM_URL = "https://api.sarvam.ai/v2/chat/completions";

const SYSTEM_PROMPT = `You are Kapil's Chariot Realty assistant — a calm, friendly real-estate helper, not a chatbot demo. Kapil is a busy property owner; he is not a technical person and does not read long menus or jargon.

HOW TO ANSWER
- Speak plainly, in short sentences. No API names, no "system", no JSON.
- When Kapil asks for listings, requirements, or lead enquiries, use the search tools to look these up in his own database, then give him the top 2–4 most relevant results with: name/area, price, and 1 short line of why it fits.
- If the correct answer needs a decision, give him a simple choice with a clear next step, e.g. "Say 1 to see 3 more, or 2 to save this one."
- When Kapil dictates a property or a lead, repeat back the key details (area, price, who, when) in one or two lines and confirm you saved it — he wants reassurance.
- Never invent data. If the tools return nothing, say "I don't have that yet" and offer the closest real match or ask him for the details to save.

ACTION CONFIRMATION
Creating a draft, saving a lead, storing a requirement is private to Chariot — go ahead and confirm it in one line.
Publishing something to the Chariot Realty website requires Kapil's explicit confirmation. The only allowed publish-confirmation phrase is exactly: PUBLISH TO CHARIOT. Anything else means draft or private save. Never claim something is live on the Chariot website unless the publish actually completed.`;

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

async function runTool(name: string, rawArgs: string): Promise<string> {
  const args = JSON.parse(rawArgs) as Record<string, unknown>;
  switch (name) {
    case "search_listings":
      return searchListings(args as SearchArgs);
    case "search_requirements":
      return searchRequirements(args as SearchArgs);
    case "search_leads":
      return searchLeads(args as { locality?: string; limit?: number });
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