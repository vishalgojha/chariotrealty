import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/leads/admin";
import { materializeDraft, resolveTable, type DraftTable } from "@/lib/drafts";

export const dynamic = "force-dynamic";

// Publishes a typed draft by materialising it into chariot_properties, which
// is the table the public site reads. The row is created as a draft so it can
// still be reviewed in the Inventory tab before the PATCH that makes it public.
export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const body = (await request.json().catch(() => ({}))) as { table?: unknown; id?: unknown; publish?: unknown };
  const table = resolveTable(body.table);
  if (!table) return NextResponse.json({ error: "Unknown draft table" }, { status: 400 });

  const id = Number(body.id);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "A valid draft id is required" }, { status: 400 });

  try {
    const { created, property } = await materializeDraft(table, id);
    if (body.publish === true) {
      const published = await fetch(
        `${(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "")}/rest/v1/chariot_properties?id=eq.${encodeURIComponent(String((property as Record<string, unknown>)?.id || ""))}`,
        {
          method: "PATCH",
          headers: {
            apikey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ""}`,
            "Content-Type": "application/json",
            Prefer: "return=representation",
          },
          body: JSON.stringify({ status: "published", published_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
          cache: "no-store",
        },
      );
      if (!published.ok) return NextResponse.json({ error: "Draft was created but could not be published" }, { status: 502 });
      return NextResponse.json({ data: (await published.json().catch(() => []))[0], created });
    }
    return NextResponse.json({ data: property, created });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not publish the draft" }, { status: 502 });
  }
}
