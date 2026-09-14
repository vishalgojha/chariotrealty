import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/leads/admin";
import { disconnectWhatsapp } from "@/lib/whatsapp";

export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  try { return NextResponse.json(await disconnectWhatsapp()); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "WhatsApp disconnect unavailable" }, { status: 503 }); }
}
