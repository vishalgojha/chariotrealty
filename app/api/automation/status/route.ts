import { NextResponse } from "next/server";
import { composioStatus } from "@/lib/composio";

export function GET() {
  return NextResponse.json({ service: "chariot-realty-automations", ...composioStatus() });
}
