import { NextResponse } from "next/server";
import { BUILD_SHA, BUILD_FINGERPRINT } from "@/lib/build-info.generated";

export const dynamic = "force-dynamic";

function database() {
  return {
    url: (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, ""),
    key: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  };
}

// Coolify can use this as a readiness check. It deliberately returns only a
// generic status: the detailed database error belongs in server logs, not in a
// public health response.
export async function GET() {
  const { url, key } = database();
  if (!url || !key) {
    return NextResponse.json({ ok: false, build: BUILD_SHA, fingerprint: BUILD_FINGERPRINT }, { status: 503 });
  }

  try {
    const response = await fetch(`${url}/rest/v1/chariot_properties?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`database returned ${response.status}`);
    return NextResponse.json({ ok: true, build: BUILD_SHA, fingerprint: BUILD_FINGERPRINT }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[health] inventory database check failed", error);
    return NextResponse.json({ ok: false, build: BUILD_SHA, fingerprint: BUILD_FINGERPRINT }, { status: 503 });
  }
}
