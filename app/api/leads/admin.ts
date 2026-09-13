import { NextRequest, NextResponse } from "next/server";

export function requireAdmin(request: NextRequest) {
  const configured = process.env.ADMIN_DASHBOARD_KEY;
  const provided = request.headers.get("x-admin-key") || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!configured) return NextResponse.json({ error: "Admin dashboard is not configured" }, { status: 503 });
  if (!provided || provided !== configured) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return null;
}
