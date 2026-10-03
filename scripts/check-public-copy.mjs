// Checks that nothing identifying the person who supplied a listing can reach a
// public description, in both directions: text lifted from a broker's own
// message, and copy written by the model or by hand.
//
// Run with `npm run check:copy`. Node strips the TypeScript types, so no test
// runner is needed; this runs before a deploy because the thing it guards is a
// privacy promise made to third parties.
import { readFileSync } from "node:fs";
import { identityTermsFrom, rowIdentityTerms, sanitizePublicCopy } from "../lib/public-copy.ts";

let failures = 0;

function check(name, actual, expected) {
  const ok = actual === expected;
  if (!ok) failures += 1;
  console.log(`${ok ? "pass" : "FAIL"}  ${name}`);
  if (!ok) {
    console.log(`      expected: ${JSON.stringify(expected)}`);
    console.log(`      actual:   ${JSON.stringify(actual)}`);
  }
}

function mustContain(name, text, needles) {
  const missing = needles.filter((n) => !text.toLowerCase().includes(n.toLowerCase()));
  if (missing.length) failures += 1;
  console.log(`${missing.length ? "FAIL" : "pass"}  ${name}`);
  if (missing.length) console.log(`      missing: ${missing.join(", ")} in ${JSON.stringify(text)}`);
}

function mustNotContain(name, text, needles) {
  const found = needles.filter((n) => text.toLowerCase().includes(n.toLowerCase()));
  if (found.length) failures += 1;
  console.log(`${found.length ? "FAIL" : "pass"}  ${name}`);
  if (found.length) console.log(`      leaked: ${found.join(", ")} in ${JSON.stringify(text)}`);
}

// A real parsed listing: the description column still holds the message.
const raw =
  "From WhatsApp (group Pali Hill Rentals · Ramesh Verma · (+919833012345) · at 2026-09-28 18:04): " +
  "3 BHK flat in Pali Hill, 1200 sqft carpet, 4th floor, covered parking, gym and pool. " +
  "Rent 2.8L, brokered by Ramesh Verma. Contact Ramesh on 98330 12345. Immediate possession.";

const terms = identityTermsFrom(raw);
check("reads the sender and group out of the provenance", JSON.stringify(terms), '["Pali Hill Rentals","Ramesh Verma"]');

const cleaned = sanitizePublicCopy(raw, terms);
mustContain("keeps property facts", cleaned, ["3 BHK", "1200 sqft", "4th floor", "gym and pool", "Immediate possession"]);
mustNotContain("drops the supplier and every way of reaching them", cleaned, [
  "Ramesh",
  "Pali Hill Rentals",
  "98330",
  "brokered",
  "Contact",
  "WhatsApp",
]);

// Ordinary copy must survive. A seller's message is full of "·" separators and
// parentheticals; reading those as provenance is how a good description gets
// silently deleted.
const sellerMessage = "3 BHK · 1200 sqft · 4th floor · Pali Hill · rent 2.8L · immediate possession";
check("a seller message is not read as an identity line", identityTermsFrom(sellerMessage).length, 0);
check(
  "middot-separated copy survives intact",
  sanitizePublicCopy(sellerMessage, identityTermsFrom(sellerMessage)),
  "3 BHK · 1200 sqft · 4th floor · Pali Hill · rent 2.8L · immediate possession.",
);
check(
  "parentheticals in copy are left alone",
  identityTermsFrom("Sunlit flat (near the beach) with (big rooms)").length,
  0,
);
check(
  "figures are not mistaken for phone numbers",
  sanitizePublicCopy("2 BHK in Versova, 900 sqft, rent 75,000 per month, possession from March."),
  "2 BHK in Versova, 900 sqft, rent 75,000 per month, possession from March.",
);

check("a bare label is still read", JSON.stringify(identityTermsFrom("group Sea View · Bob · (+919999999999)")), '["Sea View","Bob"]');
check("nothing publishable returns empty, not a mangled sentence", sanitizePublicCopy("Call me", []), "");
check("a name in a clause drops the whole clause", sanitizePublicCopy("Listing by Ramesh Verma is a nice 1 BHK in Andheri, 600 sqft.", ["Ramesh Verma"]), "");

// The published description is written by the model or by hand, so it has to be
// sanitised again on the way out. These are the only two places that put copy in
// front of a visitor: reading the stored key, and materialising a draft.
// The modules cannot be imported directly because they use the "@/" path alias,
// which plain Node does not resolve, so the wiring is asserted at source level.
for (const [name, file, needle] of [
  ["lib/listing.ts reads the generated key", "lib/listing.ts", "PUBLIC_DESCRIPTION_KEY"],
  ["lib/listing.ts sanitises the description it returns", "lib/listing.ts", "const generated = sanitizePublicCopy("],
  ["lib/listing.ts filters the key it sends to the client", "lib/listing.ts", "PUBLIC_TEXT_KEYS"],
  ["lib/drafts.ts sanitises the copy it publishes", "lib/drafts.ts", "sanitizePublicCopy(String(extracted.public_description)"],
]) {
  const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  check(name, source.includes(needle), true);
}

check("identity terms include the stored label", JSON.stringify(rowIdentityTerms({
  description: "3 BHK in Bandra",
  customFields: { source_label: "group Sea View · Bob · (+919999999999) · at 18:04" },
})), '["Sea View","Bob"]');

console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
process.exit(failures ? 1 : 0);