import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/leads/admin";
import { DescriptionError, generatePublicDescription } from "@/lib/listing-description";

// Writes the public description from whatever Kapil pasted or typed into the
// admin desk. The row is not touched here: the form saves it on save, so a
// generated description is never live until it has been reviewed.
export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const body = await request.json().catch(() => ({}));
  const notes = String(body?.notes || "").trim();

  try {
    const description = await generatePublicDescription(notes, Array.isArray(body?.identity) ? body.identity.map(String) : []);
    return NextResponse.json({ data: { description } });
  } catch (error) {
    if (error instanceof DescriptionError) {
      const status = /configured/.test(error.message) ? 503 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not reach the model" },
      { status: 502 },
    );
  }
}