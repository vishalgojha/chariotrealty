import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/leads/admin";

const STATUSES = new Set(["new", "contacted", "interested", "follow_up", "converted", "closed"]);
const PRIORITIES = new Set(["low", "normal", "high", "urgent"]);

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });

  const body = await request.json();
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.status === "string" && STATUSES.has(body.status)) payload.status = body.status;
  if (typeof body.priority === "string" && PRIORITIES.has(body.priority)) payload.priority = body.priority;
  if (body.next_follow_up_at === null || typeof body.next_follow_up_at === "string") payload.next_follow_up_at = body.next_follow_up_at;
  if (body.last_contacted_at === null || typeof body.last_contacted_at === "string") payload.last_contacted_at = body.last_contacted_at;
  if (body.follow_up_note === null || typeof body.follow_up_note === "string") payload.follow_up_note = body.follow_up_note;
  if (Object.keys(payload).length === 1) return NextResponse.json({ error: "No supported lead fields supplied" }, { status: 400 });

  const response = await fetch(`${url}/rest/v1/chariot_leads?id=eq.${encodeURIComponent(params.id)}`, {
    method: "PATCH",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  return NextResponse.json(response.ok ? { data: data[0] } : { error: data.message || "Could not update lead" }, { status: response.ok ? 200 : 502 });
}
