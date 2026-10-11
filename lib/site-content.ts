export type SiteContent = {
  section: string;
  title: string;
  contentBody: string;
  highlightBulletPoints: string[];
  ctaLink?: string;
};

export type SiteContentRow = {
  section: string;
  title: string;
  content_body: string;
  highlight_bullet_points: string[];
  cta_link?: string;
};

export const SITE_SECTIONS = ["about_us"] as const;

function normalize(row?: Partial<SiteContentRow> | null): SiteContent | null {
  if (!row?.section) return null;
  const bullets = Array.isArray(row.highlight_bullet_points)
    ? row.highlight_bullet_points.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
  const ctaLink = typeof row.cta_link === "string" && /^https?:\/\//i.test(row.cta_link) ? row.cta_link : undefined;
  return {
    section: row.section.trim(),
    title: String(row.title ?? "").trim(),
    contentBody: String(row.content_body ?? "").trim(),
    highlightBulletPoints: bullets,
    ctaLink,
  };
}

function config() {
  return {
    url: (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, ""),
    key: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  };
}

/**
 * Read one editable site-content section for the public site.
 *
 * The public site must keep rendering even if the content table is unreachable,
 * so a read error resolves to null rather than throwing — callers fall back to
 * their own static copy.
 */
export async function readSiteContent(section: string): Promise<SiteContent | null> {
  const { url, key } = config();
  if (!url || !key) return null;
  try {
    const response = await fetch(
      `${url}/rest/v1/chariot_site_content?select=section,title,content_body,highlight_bullet_points,cta_link&section=eq.${encodeURIComponent(section)}&limit=1`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store" },
    );
    if (!response.ok) return null;
    const rows = await response.json();
    const row = Array.isArray(rows) ? (rows[0] as SiteContentRow | undefined) : undefined;
    return normalize(row);
  } catch {
    return null;
  }
}

/**
 * Persist an edited section (admin only).
 *
 * `content` is passed already-validated by the caller; this layer only shapes
 * the record and stamps updated_at so the site picks up the change immediately.
 */
export async function writeSiteContent(section: string, content: { title?: string; contentBody?: string; highlightBulletPoints?: string[]; ctaLink?: string }): Promise<SiteContentRow> {
  const { url, key } = config();
  if (!url || !key) throw new Error("Site content database is not configured");

  const payload: Record<string, unknown> = {
    section,
    updated_at: new Date().toISOString(),
  };
  if (content.title !== undefined) payload.title = String(content.title ?? "").trim();
  if (content.contentBody !== undefined) payload.content_body = String(content.contentBody ?? "").trim();
  if (content.highlightBulletPoints !== undefined) {
    payload.highlight_bullet_points = (Array.isArray(content.highlightBulletPoints) ? content.highlightBulletPoints : [])
      .filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  }
  if (content.ctaLink !== undefined) payload.cta_link = /^https?:\/\//i.test(content.ctaLink || "") ? content.ctaLink : null;

  const response = await fetch(
    `${url}/rest/v1/chariot_site_content?section=eq.${encodeURIComponent(section)}`,
    {
      method: "PATCH",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(payload),
      cache: "no-store",
    },
  );
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message || `Site content write returned ${response.status}`);
  }
  const rows = await response.json() as SiteContentRow[];
  if (!Array.isArray(rows) || !rows[0]) throw new Error("Site content write returned no row");
  return rows[0];
}