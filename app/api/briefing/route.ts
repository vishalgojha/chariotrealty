import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/leads/admin";

type Lead = {
  id: string;
  name: string;
  intent: string;
  locality?: string | null;
  status: string;
  priority?: string;
  next_follow_up_at?: string | null;
  created_at: string;
};

export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });

  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const [leadsResponse, inventoryResponse] = await Promise.all([
    fetch(`${url}/rest/v1/chariot_leads?select=id,name,intent,locality,status,priority,next_follow_up_at,created_at&order=created_at.desc&limit=100`, { headers, cache: "no-store" }),
    fetch(`${url}/rest/v1/chariot_properties?select=id,name,locality,price,status,updated_at&order=updated_at.asc&limit=100`, { headers, cache: "no-store" }),
  ]);
  if (!leadsResponse.ok || !inventoryResponse.ok) return NextResponse.json({ error: "Could not build briefing" }, { status: 502 });

  const leads = await leadsResponse.json() as Lead[];
  const inventory = await inventoryResponse.json() as Array<Record<string, unknown>>;
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;
  const open = leads.filter((lead) => !["closed", "converted"].includes(lead.status));
  const due = open.filter((lead) => lead.next_follow_up_at && new Date(lead.next_follow_up_at).getTime() <= now);
  const newLeads = leads.filter((lead) => new Date(lead.created_at).getTime() >= dayAgo);
  const staleInventory = inventory.filter((property) => {
    const updated = property.updated_at ? new Date(String(property.updated_at)).getTime() : 0;
    return property.status !== "published" || !updated || updated < now - 30 * 24 * 60 * 60 * 1000;
  }).slice(0, 5);

  return NextResponse.json({
    generated_at: new Date().toISOString(),
    counts: { new_leads: newLeads.length, due_follow_ups: due.length, stale_inventory: staleInventory.length },
    new_leads: newLeads.slice(0, 5),
    due_follow_ups: due.slice(0, 8),
    stale_inventory: staleInventory,
  });
}
