import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/leads/admin";
import { extractWhatsappListing } from "@/lib/agent";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  let rawMessageId = 0;
  const contentType = request.headers.get("content-type") || "";
  try {
    if (contentType.includes("application/json")) {
      const body = await request.json();
      rawMessageId = Number(body?.raw_message_id);
    } else {
      const formData = await request.formData();
      rawMessageId = Number(formData.get("raw_message_id"));
    }
  } catch {
    return NextResponse.json({ error: "Could not read the request body" }, { status: 400 });
  }

  if (!Number.isFinite(rawMessageId) || rawMessageId <= 0) {
    return NextResponse.json({ error: "raw_message_id required" }, { status: 400 });
  }

  try {
    const result = await extractWhatsappListing({ raw_message_id: rawMessageId });
    return NextResponse.json(JSON.parse(result));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Extraction failed" },
      { status: 500 }
    );
  }
}
