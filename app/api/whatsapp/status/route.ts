import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/leads/admin";
import { whatsappConfigStatus, whatsappStatus } from "@/lib/whatsapp";

export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  try { return NextResponse.json({ config: whatsappConfigStatus(), status: await whatsappStatus() }); }
  catch (error) { return NextResponse.json({ config: whatsappConfigStatus(), status: null, error: error instanceof Error ? error.message : "WhatsApp gateway unavailable" }, { status: 503 }); }
}
