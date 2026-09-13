import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/leads/admin";
import { runLeadAutomations } from "@/lib/composio";

export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  try {
    const body = await request.json();
    if (!body.leadId || !body.name || !body.phone) return NextResponse.json({ error: "leadId, name, and phone are required" }, { status: 422 });
    return NextResponse.json(await runLeadAutomations(body));
  } catch {
    return NextResponse.json({ error: "Invalid automation request" }, { status: 400 });
  }
}
