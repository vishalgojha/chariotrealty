import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/leads/admin";

export async function GET(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });

  const status = request.nextUrl.searchParams.get("status");
  const query = new URLSearchParams({ select: "id,name,phone,email,intent,locality,property_id,message,source,status,city,created_at", order: "created_at.desc", limit: "100" });
  if (status) query.set("status", `eq.${status}`);
  const response = await fetch(`${url}/rest/v1/chariot_leads?${query.toString()}`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store" });
  if (!response.ok) return NextResponse.json({ error: "Could not read leads" }, { status: 502 });
  return NextResponse.json({ data: await response.json() });
}
