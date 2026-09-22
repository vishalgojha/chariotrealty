import { NextRequest, NextResponse } from "next/server";
import { askAgent } from "@/lib/agent";

function authorized(request: NextRequest) {
  const configured = process.env.PROPAI_INTERNAL_TOKEN || process.env.CHARIOT_WHATSAPP_INTERNAL_TOKEN || "";
  const provided = request.headers.get("x-propai-internal-token") || "";
  return Boolean(configured && provided && configured === provided);
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!text) return NextResponse.json({ error: "Message text is required" }, { status: 400 });

    const result = await askAgent(text);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Self-chat agent unavailable" },
      { status: 502 },
    );
  }
}
