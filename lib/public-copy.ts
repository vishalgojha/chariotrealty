// Public listing copy is written from structured fields or generated from a
// broker's own words. Either way it must never repeat who supplied the listing:
// the raw message behind a parsed listing carries a name, a phone number, a
// group name and a timestamp, and none of that belongs on a public page.
//
// Sanitising happens on the way in (when the description is generated) and again
// on the way out (when it is published), because a value written straight to the
// database by a human must be filtered just as strictly as a generated one.

export const PUBLIC_DESCRIPTION_KEY = "public_description";

// Phone numbers, WhatsApp links and email addresses. The digit run has to be
// long enough to ignore ordinary figures: "1,200 sqft", "3 BHK" and "₹2.80L" all
// survive, while "+91 98330 12345" and "2026-09-2" do not.
const CONTACT_PATTERN = /(?:\+?\d[\d\s().-]{7,}\d)|(?:[\w.+-]+@[\w-]+\.[\w.]+)|(?:wa\.me\/\d+)/i;

// Clauses that exist to pass on someone's contact details rather than to describe
// a property. Matched loosely, so "brokered" and "ownership" go too.
const CONTACT_CLAUSE = /\b(contact\w*|call\s+me|call\s+us|whats\w*|reach\w*|ping\s+me|dm\s+me|broker\w*|owner\w*|agent\w*|seller\w*|landlord\w*|sir|madam|enquir\w*)\b/i;

export function containsSourceContact(value: string): boolean {
  return CONTACT_PATTERN.test(value);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// The provenance line the parser writes into a description. The parentheses nest
// ("(group Pali Hill Rentals · Ramesh Verma · (+919833012345) · at …)") so a
// flat \([^)]*\) stops at the phone number's closing bracket and leaves the
// timestamp behind to poison the rest of the sentence.
const PROVENANCE_PREFIX = /^\s*from\s+(?:whatsapp|whatsapp\s+group|a\s+group|dictation|the\s+assistant|assistant)\s*\((?:[^()]|\([^()]*\))*\)\s*:?\s*/i;

function stripProvenance(text: string): string {
  return text.replace(PROVENANCE_PREFIX, "");
}

// A provenance label that was never wrapped in brackets, as stored on
// source_label: "group Pali Hill Rentals · Ramesh Verma · (+91…) · at 18:04".
// The leading keyword is what tells provenance apart from ordinary copy, because
// a seller's message is full of "·" separators ("3 BHK · 1200 sqft · 4th floor")
// and reading those as names would delete the description.
const UNWRAPPED_LABEL = /^\s*(?:group\s+|direct\s+chat|sender\b|from\s|by\s)/i;

function identityPieces(inner: string): string[] {
  const terms: string[] = [];
  for (const piece of inner.split(/[·,;|/]/)) {
    // Trim first: the pieces are surrounded by separator spaces, and the
    // keyword below is anchored, so trimming afterwards left "at :04" behind.
    const cleaned = piece
      .trim()
      .replace(/[()]/g, "")
      .replace(/^(?:group|direct\s+chat|at|from|by|sender)\b[\s:]+/i, "")
      .replace(/\+?\d[\d\s().-]{6,}\d/g, "")
      .trim()
      .replace(/^[\s:;,\-–—/|.]+/, "")
      .replace(/[\s:;,\-–—/|.]+$/, "")
      .trim();
    // A name, not a leftover fragment such as ":04" or "sqft".
    if (cleaned.length < 3) continue;
    if (!/[A-Za-z]{2}/.test(cleaned) || /^\d/.test(cleaned)) continue;
    // "From WhatsApp (group …" leaves the channel in the first piece once the
    // brackets are removed, which is not anyone's name.
    if (/whats\s?app|telegram|assistant|dictation|\bgroup\b|\bsender\b/i.test(cleaned)) continue;
    terms.push(cleaned);
  }
  return terms;
}

/**
 * Lifts the words that identify whoever supplied the listing out of a provenance
 * line, so they can be redacted from generated copy. Only provenance that is
 * actually shaped like provenance is read: a bracketed group containing a "·"
 * separator, a pipe or a digit run, or an unwrapped label that opens with a
 * provenance keyword. A phrase like "(near the beach)" in ordinary copy is left
 * alone.
 */
export function identityTermsFrom(text: string | null | undefined): string[] {
  if (!text) return [];
  const terms: string[] = [];
  for (const match of Array.from(text.matchAll(/\(([^()]{3,240}(?:\([^()]*\))?[^()]{0,240})\)/g))) {
    const inner = match[1];
    if (!/[·|]/.test(inner) && !/\d[\d\s().-]{6,}\d/.test(inner)) continue;
    terms.push(...identityPieces(inner));
  }
  // source_label is stored without the surrounding brackets. Skipped when the
  // text is a whole "From WhatsApp (…): <description>" sentence: the bracketed
  // group was already read above, and parsing the sentence as a label too would
  // turn its property copy ("covered parking", "gym and pool") into names.
  if (!PROVENANCE_PREFIX.test(text) && UNWRAPPED_LABEL.test(text) && /[·|]/.test(text)) {
    terms.push(...identityPieces(text));
  }
  return Array.from(new Set(terms));
}

function mentionsTerm(text: string, terms: string[]): boolean {
  return terms.some((term) => new RegExp(`\\b${escapeRegExp(term)}\\b`, "i").test(text));
}

/**
 * Turns broker notes into something publishable.
 *
 * A clause that carries a contact detail, or that names whoever supplied the
 * listing, is dropped whole rather than patched up, because half a sentence
 * about a person is still about that person. Surviving clauses are joined and
 * stripped of any remaining number. Returns an empty string when nothing
 * describable is left, so callers fall back to the structured facts instead of
 * publishing a mangled sentence.
 */
export function sanitizePublicCopy(input: string | null | undefined, identityTerms: string[] = []): string {
  if (!input) return "";

  const clauses = stripProvenance(input)
    .split(/\n+|(?<=[.;!?])\s+/)
    .map((clause) => clause.trim())
    .filter(Boolean)
    .filter((clause) => !CONTACT_CLAUSE.test(clause))
    .filter((clause) => !containsSourceContact(clause))
    .filter((clause) => !mentionsTerm(clause, identityTerms));

  const cleaned = clauses
    .join(" ")
    .replace(CONTACT_PATTERN, " ")
    // Words left stranded by removing a number.
    .replace(/\b(?:on|at|to|from|number|ph|phone|mob|mobile|no)\b\s*(?=[.,;:!?]|$)/gi, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .replace(/^[^A-Za-z0-9]+/, "")
    .replace(/[^A-Za-z0-9.!?]+$/, "")
    .trim();

  if (!cleaned || cleaned.length < 25) return "";

  const capped = cleaned.length > 620 ? `${cleaned.slice(0, 620).replace(/\s+\S*$/, "")}…` : cleaned;
  return /[.!?…]$/.test(capped) ? capped : `${capped}.`;
}

/** Identity terms for a listing row: the provenance line plus any stored label. */
export function rowIdentityTerms(row: { description?: string | null; customFields?: Record<string, unknown> }): string[] {
  const label = row.customFields?.source_label ?? row.customFields?.source ?? "";
  return Array.from(new Set([...identityTermsFrom(row.description), ...identityTermsFrom(typeof label === "string" ? label : "")]));
}