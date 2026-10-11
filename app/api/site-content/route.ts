import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/leads/admin";
import { readSiteContent, writeSiteContent, SITE_SECTIONS } from "@/lib/site-content";

export async function GET(request: NextRequest) {
  const section = request.nextUrl.searchParams.get("section") || "about_us";
  if (!SITE_SECTIONS.includes(section as (typeof SITE_SECTIONS)[number])) {
    return NextResponse.json({ error: "Unknown section" }, { status: 404 });
  }
  const content = await readSiteContent(section);
  if (!content) return NextResponse.json({ data: null }, { status: 200 });
  return NextResponse.json({ data: content }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const section = request.nextUrl.searchParams.get("section") || "about_us";
  if (!SITE_SECTIONS.includes(section as (typeof SITE_SECTIONS)[number])) {
    return NextResponse.json({ error: "Unknown section" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  if (typeof body.title !== "string" && typeof body.contentBody !== "string" && !Array.isArray(body.highlightBulletPoints) && "ctaLink" in body === false) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  try {
    const row = await writeSiteContent(section, {
      title: typeof body.title === "string" ? body.title : undefined,
      contentBody: typeof body.contentBody === "string" ? body.contentBody : undefined,
      highlightBulletPoints: Array.isArray(body.highlightBulletPoints) ? body.highlightBulletPoints : undefined,
      ctaLink: "ctaLink" in body ? (typeof body.ctaLink === "string" ? body.ctaLink : "") : undefined,
    });
    return NextResponse.json({ data: row }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update site content" }, { status: 502 });
  }
}