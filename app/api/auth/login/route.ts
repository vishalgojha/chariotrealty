import { NextRequest, NextResponse } from "next/server";
import { signInWithPassword } from "@/lib/supabase-auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!email || !password) return NextResponse.json({ error: "Email and password are required" }, { status: 422 });
    return NextResponse.json(await signInWithPassword(email, password));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Supabase login failed" }, { status: 401 });
  }
}
