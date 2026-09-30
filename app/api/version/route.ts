import { NextResponse } from "next/server";
import { BUILD_SHA } from "@/lib/build-info.generated";

export const dynamic = "force-dynamic";

// Reports the commit this container was built from, so a deploy that is still
// rolling out can be told apart from a genuine bug.
export async function GET() {
  return NextResponse.json(
    { build: BUILD_SHA, deployed_at: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
