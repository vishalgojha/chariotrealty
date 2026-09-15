import { NextRequest, NextResponse } from "next/server";
import { requestSupabasePasswordReset, updateSupabasePassword } from "@/lib/supabase-auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (body.action === "request") {
      const email = String(body.email || "").trim().toLowerCase();
      if (!email) return NextResponse.json({ error: "Email is required" }, { status: 422 });
      await requestSupabasePasswordReset(email);
      return NextResponse.json({ ok: true });
    }
    if (body.action === "update") {
      const token = String(body.access_token || "");
      const password = String(body.password || "");
      if (!token || password.length < 8) return NextResponse.json({ error: "Use a reset link and a password of at least 8 characters" }, { status: 422 });
      await updateSupabasePassword(token, password);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Unsupported password action" }, { status: 400 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Password reset failed" }, { status: 400 }); }
}
