import { requireSupabase } from "../config/supabase.js";
import { normalizePhone } from "../utils/phone.js";
import { startOfToday, startOfWeek } from "../utils/time.js";

export async function getLeadByPhone(phone) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("leads")
    .select("id, phone, name, bhk, area, budget, deal_type, status, source, created_at")
    .eq("phone", normalizePhone(phone))
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch lead: ${error.message}`);
  }

  return data;
}

export async function upsertLead(details) {
  const supabase = requireSupabase();
  const payload = {
    phone: normalizePhone(details.phone),
    name: details.name ?? null,
    bhk: details.bhk != null ? Number(details.bhk) : null,
    area: details.area ?? null,
    budget: details.budget ?? null,
    deal_type: details.deal_type ?? null,
    status: details.status ?? "new",
    source: details.source ?? "direct"
  };

  const existing = await getLeadByPhone(payload.phone);
  if (existing) {
    const updatePayload = {
      name: payload.name ?? existing.name,
      bhk: payload.bhk ?? existing.bhk,
      area: payload.area ?? existing.area,
      budget: payload.budget ?? existing.budget,
      deal_type: payload.deal_type ?? existing.deal_type,
      status: payload.status ?? existing.status,
      source: payload.source ?? existing.source
    };

    const { error } = await supabase.from("leads").update(updatePayload).eq("id", existing.id);
    if (error) {
      throw new Error(`Failed to update lead: ${error.message}`);
    }
    return getLeadByPhone(payload.phone);
  }

  const { data, error } = await supabase
    .from("leads")
    .insert(payload)
    .select("id, phone, name, bhk, area, budget, deal_type, status, source, created_at")
    .single();

  if (error) {
    throw new Error(`Failed to create lead: ${error.message}`);
  }

  return data;
}

export async function updateLeadPreferences(phone, preferences) {
  const current = (await getLeadByPhone(phone)) || { phone: normalizePhone(phone) };
  return upsertLead({
    phone: current.phone,
    name: preferences.name ?? current.name,
    bhk: preferences.bhk ?? current.bhk,
    area: preferences.area ?? current.area,
    budget: preferences.budget ?? current.budget,
    deal_type: preferences.deal_type ?? current.deal_type,
    status: current.status || "new",
    source: preferences.source ?? current.source ?? "direct"
  });
}

export async function updateLeadStatus(phone, status) {
  const supabase = requireSupabase();
  const { error } = await supabase
    .from("leads")
    .update({ status })
    .eq("phone", normalizePhone(phone));

  if (error) {
    throw new Error(`Failed to update lead status: ${error.message}`);
  }

  return getLeadByPhone(phone);
}

export async function getLeads(filters = {}) {
  const supabase = requireSupabase();
  let query = supabase
    .from("leads")
    .select("id, phone, name, bhk, area, budget, deal_type, status, source, created_at")
    .order("created_at", { ascending: false })
    .limit(Number(filters.limit || 100));

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (filters.phone) {
    query = query.eq("phone", normalizePhone(filters.phone));
  }

  if (filters.deal_type) {
    query = query.eq("deal_type", filters.deal_type);
  }

  if (filters.source) {
    query = query.eq("source", filters.source);
  }

  if (filters.period === "today") {
    query = query.gte("created_at", startOfToday());
  } else if (filters.period === "week") {
    query = query.gte("created_at", startOfWeek());
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to fetch leads: ${error.message}`);
  }

  return data || [];
}
