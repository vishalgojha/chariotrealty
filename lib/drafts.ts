// Drafts produced by WhatsApp extraction and by Kapil's dictation live in the
// four typed listing tables, which carry the detail (configuration, furnishing,
// areas, rent, parking) but are not what the public site reads. The public
// site, the admin Inventory tab, and the publish endpoint all read
// chariot_properties.
//
// These helpers publish a typed draft by materialising it into
// chariot_properties, linked back by source_reference, so the two systems
// stay separate and nothing is dual-written at extraction time.

const TABLES = {
  residential_sale: "chariot_residential_sale_listings",
  residential_rent: "chariot_residential_rent_listings",
  commercial_sale: "chariot_commercial_sale_listings",
  commercial_rent: "chariot_commercial_rent_listings",
} as const;

export type DraftTable = keyof typeof TABLES;

export const DRAFT_TABLES = Object.keys(TABLES) as DraftTable[];

// Only these names may reach a PostgREST URL, so a caller cannot pick an
// arbitrary table.
export function resolveTable(name: unknown): string | null {
  return typeof name === "string" && name in TABLES ? TABLES[name as DraftTable] : null;
}

function db() {
  return {
    url: (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, ""),
    key: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  };
}

async function postgrest(path: string, init: RequestInit): Promise<Response> {
  const { url, key } = db();
  if (!url || !key) throw new Error("Inventory database is not configured");
  return fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init.headers || {}) },
    cache: "no-store",
  });
}

export function sourceReference(table: DraftTable, id: number): string {
  return `${table}:${id}`;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// broker_notes is a jsonb list of {note} objects, so reading it as a string
// produced "[object Object]" as the public description.
function textOf(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(textOf).filter(Boolean).join("\n\n");
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["note", "text", "description", "body"]) {
      if (record[key] != null) return textOf(record[key]);
    }
    return JSON.stringify(value);
  }
  return String(value);
}

// A typed row has to be reshaped into the display columns the public site and
// the property page actually read.
function toPublicProperty(table: DraftTable, row: Record<string, unknown>, slug: string) {
  const transaction = table.endsWith("rent") ? "rent" : "sale";
  const category = table.startsWith("commercial") ? "commercial" : "residential";
  const name = String(row.summary_title || row.building_name || "").trim();
  const locality = String(row.locality_resolved || row.locality_raw || "").trim();

  const priceRaw = String(row.price_raw_text || "").trim();
  const rent = row.monthly_rent == null ? null : Number(row.monthly_rent);
  const asking = row.total_asking_price == null ? null : Number(row.total_asking_price);
  const priceValue = transaction === "rent" ? rent : asking ?? row.price_value;

  // Only columns that actually exist on chariot_properties may be written:
  // PostgREST rejects the whole insert if one is unknown, which is how a
  // publish can fail with no obvious cause. The price as the customer wrote it
  // goes in custom_fields, which is where the table keeps detail like this.
  const customFields: Record<string, unknown> = {};
  if (priceRaw) customFields.price_raw_text = priceRaw;
  if (row.built_up_area_sqft != null) customFields.built_up_area_sqft = row.built_up_area_sqft;
  if (row.furnishing_status) customFields.furnishing_status = String(row.furnishing_status);

  return {
    slug,
    name,
    category,
    configuration: String(row.configuration_type || "").trim(),
    carpet_area_sqft: row.carpet_area_sqft ?? null,
    price: priceRaw || (priceValue == null ? "" : String(priceValue)),
    price_value: priceValue ?? null,
    price_unit: transaction === "rent" ? "per_month" : "total",
    custom_fields: customFields,
    locality,
    micro_market: String(row.micro_market || "").trim(),
    location: locality,
    parking: row.car_parking_count == null ? "" : String(row.car_parking_count),
    possession: String(row.possession_status || "").trim(),
    description: textOf(row.broker_notes),
    source: String(row.source || "agent"),
    source_reference: sourceReference(table, Number(row.id)),
    status: "draft",
  };
}

// PostgREST explains schema and constraint failures precisely; passing that
// through beats a generic message that hides the cause.
async function reasonFor(response: Response, fallback: string): Promise<string> {
  const detail = ((await response.json().catch(() => ({}))) as { message?: string }).message;
  return detail ? `${fallback}: ${detail}` : fallback;
}

async function uniqueSlug(base: string, id: string | null): Promise<string> {
  let slug = base || "listing";
  for (let attempt = 0; attempt < 20; attempt++) {
    const filter = id
      ? `id=neq.${encodeURIComponent(id)}&slug=eq.${slugify(slug)}`
      : `slug=eq.${slugify(slug)}`;
    const response = await postgrest(`chariot_properties?${filter}&select=id&limit=1`, { method: "GET" });
    if (!response.ok) throw new Error("Could not verify the listing address");
    const existing = (await response.json().catch(() => [])) as unknown[];
    if (existing.length === 0) return slugify(slug);
    slug = `${base}-${attempt + 2}`;
  }
  throw new Error("Could not create a unique address for this listing");
}

// Materialises a typed draft as a chariot_properties row. Re-publishing the
// same draft updates the row it made last time instead of creating a second
// public listing.
export async function materializeDraft(table: DraftTable, id: number) {
  const source = await postgrest(`${TABLES[table]}?id=eq.${encodeURIComponent(String(id))}&select=*&limit=1`, { method: "GET" });
  if (!source.ok) throw new Error(await reasonFor(source, "Could not read the draft"));
  const rows = (await source.json().catch(() => [])) as Record<string, unknown>[];
  const row = rows[0];
  if (!row) throw new Error(`No ${table} draft with id ${id}`);

  const reference = sourceReference(table, id);
  const existing = await postgrest(`chariot_properties?source_reference=eq.${encodeURIComponent(reference)}&select=*&limit=1`, { method: "GET" });
  if (!existing.ok) throw new Error(await reasonFor(existing, "Could not check for an existing published listing"));
  const current = ((await existing.json().catch(() => [])) as Record<string, unknown>[])[0];

  const name = String(row.summary_title || row.building_name || "").trim();
  const locality = String(row.locality_resolved || row.locality_raw || "").trim();
  const currentId = current ? String(current["id"]) : null;
  const currentSlug = current ? String(current["slug"] || "") : "";
  const slug = currentId ? currentSlug : await uniqueSlug(slugify(`${name}-${locality}`), null);
  const property = toPublicProperty(table, row, slug);

  if (current) {
    const response = await postgrest(`chariot_properties?id=eq.${encodeURIComponent(String(current.id))}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ ...property, updated_at: new Date().toISOString() }),
    });
    if (!response.ok) throw new Error(await reasonFor(response, "Could not update the published listing"));
    const updated = ((await response.json().catch(() => [])) as Record<string, unknown>[])[0];
    return { created: false, property: updated };
  }

  const response = await postgrest("chariot_properties", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ ...property, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
  });
  if (!response.ok) throw new Error(await reasonFor(response, "Could not create the published listing"));
  const inserted = ((await response.json().catch(() => [])) as Record<string, unknown>[])[0];
  return { created: true, property: inserted };
}

// Typed drafts that have no public counterpart yet, plus those already
// published, so the admin can see where each one stands.
export async function listDrafts() {
  const results = await Promise.all(
    DRAFT_TABLES.map(async (table) => {
      const response = await postgrest(`${TABLES[table]}?select=*&order=created_at.desc&limit=50`, { method: "GET" });
      if (!response.ok) {
        const detail = ((await response.json().catch(() => ({}))) as { message?: string }).message;
        return { table, drafts: [], error: detail || `read failed with status ${response.status}` };
      }
      const rows = (await response.json().catch(() => [])) as Record<string, unknown>[];
      return {
        table,
        drafts: rows.map((row) => ({
          table,
          id: Number(row.id),
          name: String(row.summary_title || row.building_name || ""),
          locality: String(row.locality_resolved || row.locality_raw || ""),
          configuration: String(row.configuration_type || ""),
          price: row.monthly_rent != null ? `${row.monthly_rent} per month` : row.total_asking_price != null ? String(row.total_asking_price) : "",
          source: String(row.source || ""),
          created_at: row.created_at,
        })),
      };
    }),
  );

  const published = await postgrest("chariot_properties?select=id,slug,name,status,source_reference&not.source_reference=is.null", { method: "GET" });
  const byReference = new Map<string, Record<string, unknown>>();
  if (published.ok) {
    for (const property of (await published.json().catch(() => [])) as Record<string, unknown>[]) {
      if (property.source_reference) byReference.set(String(property.source_reference), property);
    }
  }

  return results.map((group) => ({
    ...group,
    drafts: group.drafts.map((draft) => {
      const publishedProperty = byReference.get(sourceReference(draft.table, draft.id));
      return {
        ...draft,
        published_slug: publishedProperty ? String(publishedProperty.slug || "") : null,
        published_status: publishedProperty ? String(publishedProperty.status || "") : null,
      };
    }),
  }));
}
