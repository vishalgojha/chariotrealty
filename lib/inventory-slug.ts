export function slugify(value: string) {
  return value.toLowerCase().trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "property";
}

export async function uniqueInventorySlug(url: string, key: string, name: string, locality: string, excludeId?: string) {
  const base = slugify(`${name}-${locality}`);
  const query = new URLSearchParams({ select: "id,slug", slug: `like.${base}*` });
  const response = await fetch(`${url}/rest/v1/chariot_properties?${query.toString()}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  const rows = response.ok ? await response.json() as Array<{ id: string; slug: string }> : [];
  const used = new Set(rows.filter((row) => row.id !== excludeId).map((row) => row.slug));
  if (!used.has(base)) return base;
  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}
