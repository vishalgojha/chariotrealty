// Writes the description that appears on a public listing page.
//
// The notes a listing starts from are whatever the seller typed or forwarded on
// WhatsApp, and those routinely carry the sender's name, a phone number, a group
// name and a timestamp. None of that belongs on a page attributed to Kapil, so
// the model is told to leave it out and the result is then sanitised anyway: a
// model instruction is not a guarantee, and this text goes straight to the
// public site.
import { identityTermsFrom, sanitizePublicCopy } from "@/lib/public-copy";

const SARVAM_MODEL = "sarvam-105b";
const SARVAM_URL = "https://api.sarvam.ai/v1/chat/completions";

const SYSTEM_PROMPT = `You write the description shown on a Mumbai property website.

Rewrite the seller's or agent's raw notes into one or two plain sentences a buyer would read.

Rules:
- Describe only the property: configuration, carpet area, floor, furnishing, amenities, locality, price if stated, possession, and what is included.
- Never mention the sender, the owner, an agent, a broker, a landlord, a company or a group. No names.
- Never include a phone number, WhatsApp id, email address, or a request to call, contact, message or reach anyone.
- Do not invent anything. Use only facts present in the notes. If a detail is missing, leave it out.
- No headings, no bullet points, no markdown, no emoji, no quotation marks.
- Write in plain English. Reply with the description text only.`;

function tidyModelOutput(text: string): string {
  return text
    .replace(/^[\s"'`]+|[\s"'`]+$/g, "")
    .replace(/^\s*(?:description|answer)\s*:\s*/i, "")
    .replace(/[*_`#>]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export class DescriptionError extends Error {}

/**
 * Generates a publishable description from raw notes.
 *
 * `identity` is any extra names already known for the listing — the sender and
 * group recorded at extraction time — so a name the model echoed back from
 * elsewhere is still removed.
 *
 * Throws `DescriptionError` when the model is unavailable or the notes hold
 * nothing publishable. Callers fall back to the structured description rather
 * than blocking a listing on a copy failure.
 */
export async function generatePublicDescription(
  notes: string,
  identity: string[] = [],
): Promise<string> {
  const text = notes.trim();
  if (text.length < 12) throw new DescriptionError("Add a few notes about the property first");

  const apiKey = process.env.SARVAM_API_KEY || "";
  if (!apiKey) throw new DescriptionError("Description generation is not configured");

  const response = await fetch(SARVAM_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-subscription-key": apiKey,
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: SARVAM_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Write the website description for this property.\n\n${text.slice(0, 4000)}` },
      ],
      temperature: 0.3,
    }),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => ({}))) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new DescriptionError(payload?.error?.message || `The model returned HTTP ${response.status}`);
  }

  const raw = payload?.choices?.[0]?.message?.content || "";
  const description = sanitizePublicCopy(tidyModelOutput(raw), Array.from(new Set([...identityTermsFrom(text), ...identity])));
  if (!description) throw new DescriptionError("Those notes did not contain enough about the property to write a description");
  return description;
}