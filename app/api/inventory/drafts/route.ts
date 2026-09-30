import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/leads/admin";
import { listDrafts } from "@/lib/drafts";

export const dynamic = "force-dynamic";

// WhatsApp and dictation drafts live in the typed tables, so the Inventory tab
// reads them from here; it cannot see them through /api/inventory.
export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  try {
    return NextResponse.json({ data: await listDrafts() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not read drafts" }, { status: 502 });
  }
}
