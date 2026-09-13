import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/leads/admin";
import { connectWhatsapp } from "@/lib/whatsapp";

export async function POST(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  try { return NextResponse.json(await connectWhatsapp()); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "WhatsApp gateway unavailable" }, { status: 503 }); }
}
