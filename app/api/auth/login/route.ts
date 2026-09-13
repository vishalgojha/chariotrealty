import { NextRequest, NextResponse } from "next/server";
import { isAllowedSupabaseAdmin, signInWithPassword } from "@/lib/supabase-auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!email || !password) return NextResponse.json({ error: "Email and password are required" }, { status: 422 });
    const session = await signInWithPassword(email, password);
    if (!session.user || !isAllowedSupabaseAdmin(session.user)) return NextResponse.json({ error: "This Supabase account is not authorized for Chariot Realty." }, { status: 403 });
    return NextResponse.json(session);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Supabase login failed" }, { status: 401 });
  }
}
