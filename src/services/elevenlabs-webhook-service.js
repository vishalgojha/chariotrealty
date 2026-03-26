import { resolveContact } from "./contact-service.js";
import { saveConversation } from "./conversation-service.js";
import { upsertLead } from "./lead-service.js";
import { saveListing } from "./listing-service.js";
import { getConversationDetails } from "./elevenlabs-service.js";
import { parseBudget, parseDealType, sanitizeTitle } from "../utils/extractors.js";

function extractConversationId(payload = {}) {
  return (
    payload.conversation_id ||
    payload.conversationId ||
    payload.data?.conversation_id ||
    payload.event?.conversation_id ||
    null
  );
}

function extractPhone(payload = {}) {
  return (
    payload.phone ||
    payload.user_id ||
    payload.caller_id ||
    payload.system__caller_id ||
    payload.dynamic_variables?.user_phone ||
    payload.conversation_initiation_client_data?.dynamic_variables?.user_phone ||
    payload.metadata?.phone ||
    payload.data?.phone ||
    null
  );
}

function extractName(payload = {}) {
  return (
    payload.name ||
    payload.user_name ||
    payload.dynamic_variables?.user_name ||
    payload.conversation_initiation_client_data?.dynamic_variables?.user_name ||
    null
  );
}

function extractSource(payload = {}) {
  const source =
    payload.source ||
    payload.dynamic_variables?.lead_source ||
    payload.conversation_initiation_client_data?.dynamic_variables?.lead_source ||
    payload.metadata?.source ||
    "direct";

  return String(source).toLowerCase();
}

function normalizeTranscriptEntries(payload = {}) {
  const transcript =
    payload.transcript ||
    payload.data?.transcript ||
    payload.event?.transcript ||
    payload.messages ||
    [];

  if (!Array.isArray(transcript) || !transcript.length) {
    const singleMessage =
      payload.message ||
      payload.user_message ||
      payload.agent_message ||
      payload.text ||
      null;

    if (!singleMessage) {
      return [];
    }

    const role = String(payload.role || payload.sender || "user").toLowerCase();
    return [{
      message: String(singleMessage).trim(),
      sender: role.includes("agent") || role.includes("assistant") ? "agent" : "user",
      timestamp: payload.timestamp || payload.time || null
    }].filter((entry) => Boolean(entry.message));
  }

  return transcript
    .map((entry) => {
      const text =
        entry.message ||
        entry.text ||
        entry.content ||
        entry.transcript ||
        "";

      const role = String(entry.role || entry.sender || entry.speaker || "").toLowerCase();
      const sender = role.includes("agent") || role.includes("assistant")
        ? "agent"
        : "user";

      return {
        message: String(text || "").trim(),
        sender,
        timestamp: entry.timestamp || entry.time || null
      };
    })
    .filter((entry) => Boolean(entry.message));
}

function getAnalysisBlock(payload = {}) {
  return payload.analysis || payload.data?.analysis || payload.event?.analysis || {};
}

function normalizeFieldName(input) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function normalizeCollectionFields(payload = {}) {
  const analysis = getAnalysisBlock(payload);
  const rawCollection =
    payload.data_collection ||
    payload.collected_data ||
    analysis.data_collection ||
    analysis.dataCollection ||
    analysis.collected_data ||
    payload.data?.data_collection ||
    payload.data?.collected_data ||
    {};

  if (Array.isArray(rawCollection)) {
    const mapped = {};
    for (const item of rawCollection) {
      const key = normalizeFieldName(item?.name || item?.field || item?.key);
      if (!key) {
        continue;
      }
      mapped[key] = item?.value ?? item?.data ?? null;
    }
    return mapped;
  }

  if (rawCollection && typeof rawCollection === "object") {
    const mapped = {};
    for (const [key, value] of Object.entries(rawCollection)) {
      mapped[normalizeFieldName(key)] = value;
    }
    return mapped;
  }

  return {};
}

function asNumber(value) {
  if (value == null || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const cleaned = String(value).replace(/,/g, "").trim();
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeDealType(value) {
  if (value == null || value === "") {
    return null;
  }

  const lower = String(value).toLowerCase();
  if (lower.includes("rent") || lower.includes("lease")) {
    return "rent";
  }

  if (lower.includes("buy") || lower.includes("sale")) {
    return "buy";
  }

  return parseDealType(lower);
}

function buildLeadPatch({ contact, fields, source }) {
  const bhkRaw = fields.bhk ?? fields.bedrooms ?? fields.preferred_bhk;
  const budgetRaw = fields.budget ?? fields.max_budget ?? fields.price_range;
  const areaRaw = fields.area ?? fields.preferred_area ?? fields.locality;
  const dealTypeRaw = fields.deal_type ?? fields.transaction_type ?? fields.intent;
  const statusRaw = fields.status ?? fields.lead_status;
  const nameRaw = fields.name ?? fields.lead_name;
  const sourceRaw = fields.source ?? source;

  const budgetFromText = typeof budgetRaw === "string" ? parseBudget(budgetRaw) : null;

  return {
    phone: contact.phone,
    name: nameRaw ? sanitizeTitle(nameRaw) : contact.name,
    bhk: asNumber(bhkRaw),
    area: areaRaw ? sanitizeTitle(areaRaw) : null,
    budget: asNumber(budgetRaw) ?? budgetFromText,
    deal_type: normalizeDealType(dealTypeRaw),
    status: statusRaw ? String(statusRaw).toLowerCase() : undefined,
    source: sourceRaw ? String(sourceRaw).toLowerCase() : "direct"
  };
}

function buildListingPatch({ fields, contact, transcriptEntries }) {
  const fromFields = {
    building_name: fields.building_name ?? fields.building ?? fields.project ?? fields.property_name,
    bhk: asNumber(fields.bhk ?? fields.bedrooms),
    area: fields.area ?? fields.locality,
    deal_type: normalizeDealType(fields.deal_type ?? fields.transaction_type),
    price: asNumber(fields.price ?? fields.asking_price ?? fields.expected_price),
    sq_ft: asNumber(fields.sq_ft ?? fields.sqft ?? fields.carpet_area),
    floor: fields.floor ?? null,
    view: fields.view ?? null,
    notes: fields.notes ?? null
  };

  if (!fromFields.building_name) {
    const brokerText = transcriptEntries
      .map((entry) => entry.message)
      .find((text) => /\b(add listing|listing|available|inventory)\b/i.test(text));

    if (brokerText) {
      fromFields.notes = fromFields.notes || brokerText;
    }
  }

  if (!fromFields.building_name) {
    return null;
  }

  return {
    ...fromFields,
    building_name: sanitizeTitle(fromFields.building_name),
    area: fromFields.area ? sanitizeTitle(fromFields.area) : null,
    added_by: contact.phone
  };
}

async function persistTranscript({ contact, transcriptEntries, mode }) {
  // Client-data webhooks can fire frequently, often with repeated transcript slices.
  // Persist only the latest utterance in real-time mode to limit duplication.
  const entriesToSave = mode === "client_data"
    ? transcriptEntries.slice(-1)
    : transcriptEntries;

  let saved = 0;
  for (const entry of entriesToSave) {
    await saveConversation({
      phone: contact.phone,
      role: contact.role,
      message: entry.message,
      sender: entry.sender,
      timestamp: entry.timestamp
    });
    saved += 1;
  }
  return saved;
}

async function hydrateFromConversationApi({ payload, transcriptEntries }) {
  const conversationId = extractConversationId(payload);
  if (!conversationId) {
    return { payload, transcriptEntries };
  }

  const missingPhone = !extractPhone(payload);
  const missingTranscript = !transcriptEntries.length;
  if (!missingPhone && !missingTranscript) {
    return { payload, transcriptEntries };
  }

  try {
    const details = await getConversationDetails(conversationId);
    const mergedPayload = {
      ...payload,
      user_id: payload.user_id || details.user_id,
      conversation_initiation_client_data:
        payload.conversation_initiation_client_data || details.conversation_initiation_client_data,
      transcript: transcriptEntries.length ? payload.transcript : details.transcript || []
    };

    return {
      payload: mergedPayload,
      transcriptEntries: transcriptEntries.length
        ? transcriptEntries
        : normalizeTranscriptEntries(mergedPayload)
    };
  } catch {
    return { payload, transcriptEntries };
  }
}

export async function ingestElevenLabsWebhook(payload = {}, mode = "post_call") {
  let transcriptEntries = normalizeTranscriptEntries(payload);
  const hydrated = await hydrateFromConversationApi({ payload, transcriptEntries });
  const workingPayload = hydrated.payload;
  transcriptEntries = hydrated.transcriptEntries;

  const phone = extractPhone(workingPayload);
  if (!phone) {
    throw new Error("Unable to resolve phone/user_id from webhook payload");
  }

  const contact = await resolveContact({
    phone,
    name: extractName(workingPayload),
    source: extractSource(workingPayload)
  });

  const fields = normalizeCollectionFields(workingPayload);
  const source = extractSource(workingPayload);

  const savedMessages = await persistTranscript({
    contact,
    transcriptEntries,
    mode
  });

  let lead = null;
  if (contact.role === "lead") {
    lead = await upsertLead(buildLeadPatch({ contact, fields, source }));
  }

  let listing = null;
  if (contact.role === "broker" && mode !== "client_data") {
    const listingPatch = buildListingPatch({
      fields,
      contact,
      transcriptEntries
    });
    if (listingPatch) {
      listing = await saveListing(listingPatch);
    }
  }

  return {
    ok: true,
    mode,
    contact,
    conversation_id: extractConversationId(workingPayload),
    transcript_messages_saved: savedMessages,
    data_collection_fields: Object.keys(fields),
    lead_upserted: Boolean(lead),
    listing_saved: Boolean(listing),
    lead,
    listing
  };
}
