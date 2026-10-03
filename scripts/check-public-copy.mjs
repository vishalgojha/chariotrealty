// Checks the words a visitor reads on a listing: that nothing identifying the
// person who supplied it can reach a public description, in both directions
// (text lifted from a broker's own message, and copy written by the model or by
// hand), and that the sentence built from stored columns says what it should
// without repeating itself.
//
// Run with `npm run check:copy`. Node strips the TypeScript types and
// scripts/alias-hook.mjs teaches it the "@/…" path alias, so this needs no test
// runner. It runs before a deploy because the thing it guards is a promise made
// to third parties.
import { identityTermsFrom, rowIdentityTerms, sanitizePublicCopy } from "../lib/public-copy.ts";
import { listingDescription } from "../lib/listing.ts";

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

// The published description is written by the model or by hand, so it is
// sanitised again on the way out. This is the path a public page reads.
function listing(overrides) {
  return {
    id: "1",
    slug: "ten-bkc",
    name: "Ten BKC",
    category: "residential",
    locality: "Bandra East",
    microMarket: "Bandra East",
    location: "Kalanagar, Bandra East",
    price: "\u20b92.80L",
    priceValue: 280000,
    priceUnit: "monthly_rent",
    currency: "INR",
    carpetAreaSqft: 1233,
    configuration: "3 BHK",
    parking: "2",
    mediaType: "image",
    status: "published",
    description: raw,
    customFields: {},
    ...overrides,
  };
}

const fallback = listingDescription(listing({}));
mustContain("the fallback keeps the property facts", fallback, ["3 BHK", "1,233 sqft", "2 covered parking spaces"]);
mustNotContain("the fallback repeats no area twice", fallback, ["Bandra East, Bandra East", "\u00b7"]);

check(
  "an area that is already named in the location is not repeated",
  listingDescription(listing({ locality: "Khar West", microMarket: "Khar West", location: "Khar West", carpetAreaSqft: 1850 })),
  "Ten BKC is a 3 BHK, 1,850 sqft carpet area, 2 covered parking spaces property in Khar West. It is listed at \u20b92.80L / mo.",
);
check(
  "a missing area falls back to the city",
  listingDescription(listing({ locality: "", microMarket: "", location: "" })),
  "Ten BKC is a 3 BHK, 1,233 sqft carpet area, 2 covered parking spaces property in Mumbai. It is listed at \u20b92.80L / mo.",
);

const published = listingDescription(listing({
  customFields: {
    public_description:
      "A bright 3 BHK of 1,200 sqft on the 4th floor at Ten BKC. Call Ramesh Verma on +919833012345 to book a viewing.",
  },
}));
check("uses the generated description", published, "A bright 3 BHK of 1,200 sqft on the 4th floor at Ten BKC.");
mustNotContain("a hand-edited description is filtered too", published, ["Ramesh", "9833012345", "Call"]);
mustNotContain("the fallback cannot leak the raw message", fallback, ["Ramesh", "98330", "Pali Hill Rentals"]);

// Copy built from stored columns has to survive whatever is actually in the
// database: dictated listings arrive with a bare "3" and with padding on the
// name and the location, which used to read "Ten BKC  is a 3, 1,430 sqft
// carpet area property".
const dictated = listingDescription(listing({
  name: "Ten BKC ",
  configuration: "3",
  location: "Kalanagar, Bandra East ",
  locality: "Bandra East",
  microMarket: "Bandra East",
  parking: "",
  carpetAreaSqft: 1430,
  price: "\u20b92.90L",
  priceValue: 29000000,
  priceUnit: "total_price",
}));
check(
  "a dictated configuration, padded name and padded location read cleanly",
  dictated,
  "Ten BKC is a 3 BHK, 1,430 sqft carpet area property in Kalanagar, Bandra East. It is listed at \u20b92.90L.",
);

check("identity terms include the stored label", JSON.stringify(rowIdentityTerms({
  description: "3 BHK in Bandra",
  customFields: { source_label: "group Sea View · Bob · (+919999999999) · at 18:04" },
})), '["Sea View","Bob"]');

console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
process.exit(failures ? 1 : 0);