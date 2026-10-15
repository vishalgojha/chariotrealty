import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/leads/admin";
import {
  DescriptionError,
  DescriptionUnavailableError,
  descriptionNotes,
  generatePublicDescription,
  type DescriptionFacts,
} from "@/lib/listing-description";

// Writes the public description for a listing.
//
// The admin desk can send free-form notes (a pasted WhatsApp forward) or, for an
// existing listing with no message behind it, the structured facts, which are
// turned into the same brief before the model sees them. The row is not touched
// here: the form saves it on save, so a generated description is never live
// until it has been reviewed.
export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const body = await request.json().catch(() => ({}));
  const notes = String(body?.notes || "").trim();
  const facts = body?.listing && typeof body.listing === "object" ? (body.listing as DescriptionFacts) : null;
  const source = notes || (facts ? descriptionNotes(facts) : "");

  try {
    const description = await generatePublicDescription(source, Array.isArray(body?.identity) ? body.identity.map(String) : []);
    return NextResponse.json({ data: { description } });
  } catch (error) {
    if (error instanceof DescriptionUnavailableError) return NextResponse.json({ error: error.message }, { status: 502 });
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
