import { env } from "../config/env.js";
import { requireSupabase } from "../config/supabase.js";
import { normalizePhone } from "../utils/phone.js";

export async function saveListing(details) {
  const supabase = requireSupabase();
  const payload = {
    building_name: details.building_name,
    bhk: details.bhk ?? null,
    area: details.area ?? null,
    deal_type: details.deal_type ?? "buy",
    price: details.price ?? null,
    sq_ft: details.sq_ft ?? null,
    floor: details.floor ?? null,
    view: details.view ?? null,
    notes: details.notes ?? null,
    added_by: details.added_by ?? "manual"
  };

  const { data, error } = await supabase
    .from("listings")
    .insert(payload)
    .select("id, building_name, bhk, area, deal_type, price, sq_ft, floor, view, notes, added_by, created_at")
    .single();

  if (error) {
    throw new Error(`Failed to save listing: ${error.message}`);
  }

  return data;
}

export async function searchListings({ bhk, area, budget, deal_type, limit = 10 }) {
  const supabase = requireSupabase();
  let query = supabase
    .from("listings")
    .select("id, building_name, bhk, area, deal_type, price, sq_ft, floor, view, notes, added_by, created_at")
    .order("created_at", { ascending: false })
    .limit(Number(limit));

  if (bhk != null) {
    query = query.eq("bhk", Number(bhk));
  }

  if (area) {
    query = query.ilike("area", `%${area}%`);
  }

  if (budget != null) {
    query = query.lte("price", Number(budget));
  }

  if (deal_type) {
    query = query.eq("deal_type", deal_type);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to search listings: ${error.message}`);
  }

  return data || [];
}

export async function getInventorySummary() {
  const supabase = requireSupabase();
  const [{ count: totalListings, error: totalError }, { count: buyListings, error: buyError }, { count: rentListings, error: rentError }, { data: recentListings, error: recentError }] = await Promise.all([
    supabase.from("listings").select("*", { count: "exact", head: true }),
    supabase.from("listings").select("*", { count: "exact", head: true }).eq("deal_type", "buy"),
    supabase.from("listings").select("*", { count: "exact", head: true }).eq("deal_type", "rent"),
    supabase.from("listings").select("id, building_name, bhk, area, added_by, created_at").order("created_at", { ascending: false }).limit(5)
  ]);

  if (totalError || buyError || rentError || recentError) {
    throw new Error(`Failed to build inventory summary: ${(totalError || buyError || rentError || recentError).message}`);
  }

  return {
    total_listings: totalListings || 0,
    buy_listings: buyListings || 0,
    rent_listings: rentListings || 0,
    recent_listings: recentListings || []
  };
}

export async function getInventory(filters = {}) {
  const supabase = requireSupabase();
  let query = supabase
    .from("listings")
    .select("id, building_name, bhk, area, deal_type, price, sq_ft, floor, view, notes, added_by, created_at")
    .order("created_at", { ascending: false })
    .limit(Number(filters.limit || 100));

  if (filters.added_by && filters.added_by !== "broker") {
    query = query.eq("added_by", filters.added_by);
  }

  if (filters.deal_type) {
    query = query.eq("deal_type", filters.deal_type);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to fetch inventory: ${error.message}`);
  }

  let listings = data || [];

  if (filters.added_by === "broker") {
    listings = listings.filter((listing) => {
      const addedBy = normalizePhone(listing.added_by);
      return Boolean(listing.added_by) &&
        listing.added_by !== "manual" &&
        addedBy !== normalizePhone(env.kapilPhone) &&
        addedBy !== normalizePhone(env.systemNumber);
    });
  }

  return listings;
}
