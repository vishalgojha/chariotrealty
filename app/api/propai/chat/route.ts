import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/leads/admin";
import { askPropAIAnything, propaiConfigured } from "@/lib/propai-client";

export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  try {
    const body = await request.json();
    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!text) return NextResponse.json({ error: "Ask PropAI a question." }, { status: 400 });
    if (text.length > 4000) return NextResponse.json({ error: "Keep the request under 4,000 characters." }, { status: 400 });
    if (!propaiConfigured()) return NextResponse.json({ error: "PropAI agent access is not configured" }, { status: 503 });
    return NextResponse.json(await askPropAIAnything(text));
  } catch (error) {
    const message = error instanceof Error ? error.message : "PropAI agent unavailable";
    const code = message === "PropAI agent access is not configured" ? 503 : 502;
    return NextResponse.json({ error: message }, { status: code });
  }
}