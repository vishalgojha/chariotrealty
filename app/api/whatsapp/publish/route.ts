import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/leads/admin";
import { publishOwnProperty } from "@/lib/whatsapp";

export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  try {
    const body = await request.json();
    if (!body.propertyId) return NextResponse.json({ error: "propertyId is required" }, { status: 422 });
    return NextResponse.json(await publishOwnProperty(String(body.propertyId), body.confirm === true));
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not publish listing" }, { status: 400 }); }
}
