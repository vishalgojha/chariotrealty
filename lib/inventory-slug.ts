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
  // A failed uniqueness check is not the same as "no collisions". Treating an
  // error as an empty result hands back the base slug, which is how two
  // different properties end up sharing a URL and silently overwriting each
  // other on the public site. Fail loudly and let the save be retried.
  if (!response.ok) throw new Error(`Could not check slug uniqueness: HTTP ${response.status} ${response.statusText}`);
  const rows = await response.json() as Array<{ id: string; slug: string }>;
  if (!Array.isArray(rows)) throw new Error("Could not check slug uniqueness: expected an array of existing slugs");
  const used = new Set(rows.filter((row) => row.id !== excludeId).map((row) => row.slug));
  if (!used.has(base)) return base;
  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}
