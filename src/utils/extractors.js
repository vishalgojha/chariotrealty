const AREA_PATTERN = /\b(?:in|at|around|near|for|looking in)\s+([a-z][a-z\s.-]{2,40})/i;

export function parseBhk(text) {
  const match = String(text || "").match(/(\d+(?:\.\d+)?)\s*bhk/i);
  return match ? Number(match[1]) : null;
}

export function parseDealType(text) {
  const value = String(text || "").toLowerCase();
  if (/\b(rent|rental|lease|leased)\b/.test(value)) {
    return "rent";
  }

  if (/\b(sale|buy|purchase|resale|sell)\b/.test(value)) {
    return "buy";
  }

  return null;
}

export function parseBudget(text) {
  const raw = String(text || "").toLowerCase().replace(/,/g, "");
  const patterns = [
    /\b(?:budget|around|upto|up to|max|under|within)\s*(?:of)?\s*(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(cr|crore|l|lac|lakh|k|thousand)\b/i,
    /(?:₹|rs\.?|inr)\s*(\d+(?:\.\d+)?)\s*(cr|crore|l|lac|lakh|k|thousand)?\b/i,
    /\b(\d+(?:\.\d+)?)\s*(cr|crore|l|lac|lakh|k|thousand)\b/i
  ];

  const match = patterns.map((pattern) => raw.match(pattern)).find(Boolean);
  if (!match) {
    return null;
  }

  const value = Number(match[1]);
  const unit = (match[2] || "").toLowerCase();
  if (unit === "cr" || unit === "crore") {
    return value * 10000000;
  }

  if (unit === "l" || unit === "lac" || unit === "lakh") {
    return value * 100000;
  }

  if (unit === "k" || unit === "thousand") {
    return value * 1000;
  }

  return value;
}

export function parseArea(text) {
  const match = String(text || "").match(AREA_PATTERN);
  if (!match) {
    return null;
  }

  return sanitizeTitle(match[1]);
}

export function parseSqFt(text) {
  const match = String(text || "").replace(/,/g, "").match(/(\d+(?:\.\d+)?)\s*(?:sq\s*\.?\s*ft|sqft|ft2|ft\b)/i);
  return match ? Number(match[1]) : null;
}

export function parseFloor(text) {
  const match = String(text || "").match(/(\d{1,2}(?:st|nd|rd|th)?\s+floor|ground floor|lower floor|higher floor)/i);
  return match ? match[1] : null;
}

export function parseView(text) {
  const match = String(text || "").match(/\b(sea view|garden view|city view|open view|park view)\b/i);
  return match ? sanitizeTitle(match[1]) : null;
}

export function sanitizeTitle(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function detectListingIntent(text) {
  const value = String(text || "").toLowerCase();
  return /\b(listing|available|inventory|add listing|have a)\b/.test(value) && Boolean(parseBhk(value));
}

export function parseListingText(text) {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  const bhk = parseBhk(normalized);
  if (!bhk) {
    return null;
  }

  const dealType = parseDealType(normalized) || "buy";
  const price = parseBudget(normalized);
  const sqFt = parseSqFt(normalized);
  const floor = parseFloor(normalized);
  const view = parseView(normalized);
  const area = parseArea(normalized);

  const buildingMatch = normalized.match(/(?:add listing[-:\s]*)?(.+?)\s+\d+(?:\.\d+)?\s*bhk/i);
  const buildingName = buildingMatch ? sanitizeTitle(buildingMatch[1]) : null;

  if (!buildingName) {
    return null;
  }

  return {
    building_name: buildingName,
    bhk,
    area,
    deal_type: dealType,
    price,
    sq_ft: sqFt,
    floor,
    view,
    notes: normalized
  };
}

export function parseLeadPreferences(text) {
  return {
    bhk: parseBhk(text),
    area: parseArea(text),
    budget: parseBudget(text),
    deal_type: parseDealType(text)
  };
}

export function detectLeadSource(payload = {}) {
  const directSource = String(payload.source || "").toLowerCase();
  if (directSource === "meta_ads" || directSource === "instagram" || directSource === "broker" || directSource === "direct") {
    return directSource;
  }

  const referral = payload.referral || payload.raw?.referral || {};
  const serialized = JSON.stringify(referral).toLowerCase();
  if (serialized.includes("instagram")) {
    return "instagram";
  }

  if (serialized.includes("ad") || serialized.includes("meta")) {
    return "meta_ads";
  }

  return "direct";
}
