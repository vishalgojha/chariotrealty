import { NextResponse } from "next/server";
import { mumbaiMicroMarkets } from "@/lib/mumbai";

export function GET() {
  return NextResponse.json({ city: "Mumbai", data: mumbaiMicroMarkets });
}
