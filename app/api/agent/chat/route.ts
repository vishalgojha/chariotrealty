import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/leads/admin";
import { askPropAIAgent } from "@/lib/propai-agent";

export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  try {
    const body = await request.json();
    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!text) return NextResponse.json({ error: "Ask the broker agent a question." }, { status: 400 });
    if (text.length > 4000) return NextResponse.json({ error: "Keep the request under 4,000 characters." }, { status: 400 });
    return NextResponse.json(await askPropAIAgent(text));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "PropAI agent unavailable" }, { status: 502 });
  }
}
