// Writes the description that appears on a public listing page.
//
// The notes a listing starts from are whatever the seller typed or forwarded on
// WhatsApp, and those routinely carry the sender's name, a phone number, a group
// name and a timestamp. None of that belongs on a page attributed to Kapil, so
// the model is told to leave it out and the result is then sanitised anyway: a
// model instruction is not a guarantee, and this text goes straight to the
// public site.
//
// Generation runs on OpenRouter's free tier. Those endpoints are shared and get
// rate-limited without warning, so several are tried in turn rather than letting
// one busy model fail the write.
import { identityTermsFrom, sanitizePublicCopy } from "@/lib/public-copy";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const REQUEST_TIMEOUT_MS = 30_000;

// Tried in order. Free models, so a 429 or a gated endpoint just moves on to the
// next. Override with OPENROUTER_DESCRIPTION_MODEL (a comma-separated list).
const DEFAULT_MODELS = [
  "nvidia/nemotron-3-super-120b-a12b:free",
  "google/gemma-4-31b-it:free",
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "dots-studio/dots-3-note-preview:free",
  "nvidia/nemotron-3.5-lightning:free",
];

function descriptionModels(): string[] {
  const configured = (process.env.OPENROUTER_DESCRIPTION_MODEL || "")
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);
  return configured.length ? configured : DEFAULT_MODELS;
}

const SYSTEM_PROMPT = `You write the public description for a Mumbai real estate listing.

Write 2-3 natural sentences that are SEO-friendly and LLM-readable. Use only the facts provided.

- Start with the property type and configuration plus locality, e.g. "A 3 BHK apartment in Bandra West, Mumbai".
- Naturally include carpet area, price, parking, possession, RERA approval when present.
- Do NOT list amenities unless the facts explicitly contain an amenities list. Never add amenities from general knowledge.
- Use concise, factual language. No hype, no unverified superlatives.
- Avoid repeating the same locality or location. Use the area once.
- Never mention sender, owner, agent, broker, landlord, company or group. No names.
- Never include phone, WhatsApp, email or a call-to-action to contact anyone.
- Do not invent details. If a fact is missing, omit it.
- No headings, bullet points, markdown, emoji or quotation marks.
- Output plain English only, 160-220 characters ideally. Reply with the description text only.`;

function tidyModelOutput(text: string): string {
  return text
    .replace(/^[\s"'`]+|[\s"'`]+$/g, "")
    .replace(/^\s*(?:description|answer)\s*:\s*/i, "")
    .replace(/[*_`#>]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export class DescriptionError extends Error {}
/** The model could not be reached or every free model failed. Retryable. */
export class DescriptionUnavailableError extends DescriptionError {}

/** The facts the generator can be given, from a form or a stored row. */
export type DescriptionFacts = {
  name?: string;
  category?: string;
  /** "sale" or "rent", when known. */
  transaction?: string;
  /** Area as it should read in a sentence, e.g. "Hill Road, Bandra West". */
  area?: string;
  configuration?: string;
  carpetAreaSqft?: number;
  /** Already formatted, e.g. "₹3.50L" or "₹2.90L / mo". */
  price?: string;
  parking?: number;
  possession?: string;
  reraApproved?: boolean;
  amenities?: string[];
  /** Extra one-line facts such as "Balcony: yes". */
  highlights?: string[];
};

function fact(label: string, value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (Array.isArray(value)) {
    const items = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
    return items.length ? `${label}: ${items.join(", ")}` : null;
  }
  if (typeof value === "boolean") return value ? `${label}: yes` : null;
  return `${label}: ${String(value).trim()}`;
}

// Turns a stored row or an admin form into the short brief the model reads.
// Labelled in plain words, because the model is asked to write from facts and an
// unlabelled "3 / Bandra West / 2.9" gives it nothing to attach a noun to.
export function descriptionNotes(facts: DescriptionFacts): string {
  const category = (facts.category || "").trim();
  const transaction = facts.transaction === "rent" ? "for rent" : facts.transaction === "sale" ? "for sale" : "";
  const type = [category && category !== "residential" ? category : category === "residential" ? "apartment" : category, transaction]
    .filter(Boolean)
    .join(" ");

  let configuration = (facts.configuration || "").trim();
  if (/^\d+(?:\.\d+)?$/.test(configuration)) {
    configuration = category === "commercial" ? configuration : `${configuration} BHK`;
  }

  const lines = [
    fact("Property", facts.name),
    fact("Type", type),
    fact("Locality", facts.area),
    fact("Configuration", configuration),
    fact("Carpet area", facts.carpetAreaSqft ? `${facts.carpetAreaSqft.toLocaleString("en-IN")} sqft` : null),
    fact("Price", facts.price),
    fact("Parking", facts.parking ? `${facts.parking} covered ${facts.parking === 1 ? "space" : "spaces"}` : null),
    fact("Possession", facts.possession),
    fact("RERA", facts.reraApproved ? "approved" : null),
    fact("Amenities", facts.amenities),
    ...(facts.highlights ?? []).map((item) => (item.trim() ? item.trim() : null)),
  ].filter((line): line is string => Boolean(line));

  return lines.join("\n");
}

async function requestDescription(model: string, apiKey: string, notes: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://chariotrealty.in",
        "X-Title": "Chariot Realty",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Write the website description for this property.\n\n${notes}` },
        ],
        temperature: 0.4,
        max_tokens: 1024,
      }),
      cache: "no-store",
      signal: controller.signal,
    });

    const payload = (await response.json().catch(() => ({}))) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
    };
    if (!response.ok) throw new Error(payload?.error?.message || `The model returned HTTP ${response.status}`);
    return payload?.choices?.[0]?.message?.content || "";
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Generates a publishable description from raw notes or a facts brief.
 *
 * `identity` is any extra names already known for the listing — the sender and
 * group recorded at extraction time — so a name the model echoed back from
 * elsewhere is still removed.
 *
 * Throws `DescriptionError` when the input holds nothing publishable, and
 * `DescriptionUnavailableError` when no model could be reached. Callers fall back
 * to the structured description rather than blocking a listing on a copy failure.
 */
export async function generatePublicDescription(
  notes: string,
  identity: string[] = [],
): Promise<string> {
  const text = notes.trim();
  if (text.length < 12) throw new DescriptionError("Add a few notes about the property first");

  const apiKey = process.env.OPENROUTER_API_KEY || "";
  if (!apiKey) throw new DescriptionError("Description generation is not configured");

  const terms = Array.from(new Set([...identityTermsFrom(text), ...identity]));
  const failures: string[] = [];

  for (const model of descriptionModels()) {
    try {
      const raw = await requestDescription(model, apiKey, text.slice(0, 4000));
      const description = sanitizePublicCopy(tidyModelOutput(raw), terms);
      if (description) return description;
      failures.push(`${model}: empty`);
    } catch (error) {
      failures.push(`${model}: ${error instanceof Error ? error.message : "failed"}`);
    }
  }

  throw new DescriptionUnavailableError(
    `The description model is unavailable right now. Try again in a moment. (${failures.join("; ")})`,
  );
}
