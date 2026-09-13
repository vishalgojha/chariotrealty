import { NextRequest, NextResponse } from "next/server";
import { saveMumbaiLead } from "@/lib/supabase";
import { runLeadAutomations } from "@/lib/composio";

type LeadRequest = {
  name?: string;
  phone?: string;
  email?: string;
  intent?: "buy" | "rent" | "lease" | "sell" | "invest";
  locality?: string;
  propertyId?: string;
  message?: string;
  source?: string;
};

const phonePattern = /^(?:\+91\s?)?[6-9]\d{9}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  let body: LeadRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const name = body.name?.trim();
  const phone = body.phone?.replace(/[()-]/g, "").trim();
  const email = body.email?.trim().toLowerCase();

  const errors: Record<string, string> = {};
  if (!name || name.length < 2) errors.name = "Name is required";
  if (!phone || !phonePattern.test(phone.replace(/\s/g, ""))) errors.phone = "A valid Indian mobile number is required";
  if (email && !emailPattern.test(email)) errors.email = "Email address is invalid";
  if (body.intent && !["buy", "rent", "lease", "sell", "invest"].includes(body.intent)) errors.intent = "Unsupported intent";

  if (Object.keys(errors).length) return NextResponse.json({ error: "Validation failed", fields: errors }, { status: 422 });
  if (!name || !phone) return NextResponse.json({ error: "Name and phone are required" }, { status: 422 });

  const lead = await saveMumbaiLead({
    name,
    phone,
    email: email || null,
    intent: body.intent || "rent",
    locality: body.locality?.trim() || null,
    propertyId: body.propertyId || null,
    message: body.message?.trim() || null,
    source: body.source || "website",
  });

  if (!lead.ok) return NextResponse.json({ error: "Lead service is not configured", detail: lead.error }, { status: 503 });
  const automation = await runLeadAutomations({
    leadId: lead.id,
    name,
    phone,
    email: email || null,
    intent: body.intent || "rent",
    locality: body.locality?.trim() || null,
    propertyId: body.propertyId || null,
    message: body.message?.trim() || null,
  });
  return NextResponse.json({ ok: true, leadId: lead.id, automation: { enabled: automation.enabled, results: automation.results.map((result) => ({ action: result.action, status: result.status })) }, message: "Kapil will get back to you shortly." }, { status: 201 });
}
