import { NextRequest, NextResponse } from "next/server";
import { getSupabaseUser, isAllowedSupabaseAdmin } from "@/lib/supabase-auth";

export async function requireAdmin(request: NextRequest) {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (bearer) {
    const user = await getSupabaseUser(bearer);
    if (user && isAllowedSupabaseAdmin(user)) return null;
  }
  const configured = process.env.ADMIN_DASHBOARD_KEY;
  const provided = request.headers.get("x-admin-key");
  if (!configured) return NextResponse.json({ error: "Admin dashboard is not configured" }, { status: 503 });
  if (!provided || provided !== configured) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return null;
}
