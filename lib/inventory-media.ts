export type InventoryMedia = {
  storage_path: string;
  public_url: string;
  media_type: "image" | "video";
};

export const MAX_INVENTORY_MEDIA = 10;

export function normalizeInventoryMedia(value: unknown): InventoryMedia[] | null {
  if (!Array.isArray(value) || value.length > MAX_INVENTORY_MEDIA) return null;

  const media: InventoryMedia[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const candidate = item as Record<string, unknown>;
    const storagePath = typeof candidate.storage_path === "string" ? candidate.storage_path.trim() : "";
    const publicUrl = typeof candidate.public_url === "string" ? candidate.public_url.trim() : "";
    const mediaType = candidate.media_type === "video" ? "video" : candidate.media_type === "image" ? "image" : "";
    if (!storagePath || !/^https?:\/\//i.test(publicUrl) || !mediaType) return null;
    media.push({ storage_path: storagePath, public_url: publicUrl, media_type: mediaType });
  }
  return media;
}
