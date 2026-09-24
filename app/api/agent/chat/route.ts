import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/leads/admin";
import { askAgent, type AgentMessage } from "@/lib/agent";

export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  try {
    const body = await request.json();
    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!text) return NextResponse.json({ error: "Ask the broker agent a question." }, { status: 400 });
    if (text.length > 4000) return NextResponse.json({ error: "Keep the request under 4,000 characters." }, { status: 400 });
    const rawHistory = Array.isArray(body.history) ? body.history : [];
    const history: AgentMessage[] = [];
    for (const item of rawHistory.slice(-8)) {
      if (item && typeof item === "object" && "role" in item && "text" in item) {
        const role = (item as { role?: unknown }).role;
        const text = (item as { text?: unknown }).text;
        if ((role === "user" || role === "agent") && typeof text === "string") {
          history.push({ role, text: text.slice(0, 2000) });
        }
      }
    }
    return NextResponse.json(await askAgent(text, history));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Chariot agent unavailable" }, { status: 502 });
  }
}
