import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "chariot-realty-api",
    city: "Mumbai",
    timestamp: new Date().toISOString(),
  });
}
