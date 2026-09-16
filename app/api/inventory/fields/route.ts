import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/leads/admin";

function db() { return { url: (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, ""), key: process.env.SUPABASE_SERVICE_ROLE_KEY || "" }; }

export async function GET() {
  const { url, key } = db();
  if (!url || !key) return NextResponse.json({ data: [] });
  const response = await fetch(`${url}/rest/v1/chariot_inventory_fields?select=*&active=eq.true&order=sort_order.asc,created_at.asc`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store" });
  return NextResponse.json({ data: response.ok ? await response.json() : [] }, { status: response.ok ? 200 : 502 });
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  const { url, key } = db();
  if (!url || !key) return NextResponse.json({ error: "Inventory database is not configured" }, { status: 503 });
  const body = await request.json();
  const label = String(body.label || "").trim();
  const fieldKey = String(body.field_key || label).trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  const fieldType = ["text", "textarea", "number", "boolean", "date", "url"].includes(body.field_type) ? body.field_type : "text";
  if (!label || !fieldKey) return NextResponse.json({ error: "Field label is required" }, { status: 400 });
  const response = await fetch(`${url}/rest/v1/chariot_inventory_fields`, { method: "POST", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify({ field_key: fieldKey, label, field_type: fieldType, required: Boolean(body.required), sort_order: Number(body.sort_order || 0) }) });
  const payload = await response.json().catch(() => ({}));
  return NextResponse.json(response.ok ? { data: payload[0] } : { error: payload.message || "Could not add field" }, { status: response.ok ? 201 : 502 });
}
