import type { Listing } from "@/lib/listing";

const WHATSAPP = "https://wa.me/919773757759";

export function buildShareMessage(listings: Listing[], siteUrl = "https://chariotrealty.in"): string {
  if (listings.length === 0) return "";
  
  const lines = ["Chariot Realty — Property Recommendations", ""];
  
  for (const l of listings) {
    const url = `${siteUrl}/properties/${l.slug}`;
    lines.push(`${l.name}`);
    lines.push(`${l.location}, ${l.area}`);
    lines.push(`Price: ${l.price}${l.priceNote ? ` ${l.priceNote}` : ""}`);
    lines.push(`Config: ${l.configuration || "—"}`);
    lines.push(`Carpet: ${l.carpetAreaSqft?.toLocaleString()} sqft`);
    
    // Add media links (reels + photos)
    if (l.mediaLinks?.length) {
      lines.push("");
      lines.push("Media:");
      for (const m of l.mediaLinks) {
        lines.push(`• ${m.label}: ${m.href}`);
      }
    }
    lines.push(url);
    lines.push("");
  }
  
  lines.push("Reply to this message or WhatsApp Kapil: +91 97737 57759");
  return lines.join("\n");
}

export function shareToWhatsApp(listings: Listing[]): string {
  const msg = buildShareMessage(listings);
  return `${WHATSAPP}?text=${encodeURIComponent(msg)}`;
}

export function shareToEmail(listings: Listing[]): string {
  const msg = buildShareMessage(listings);
  const subject = `Property recommendations from Chariot Realty (${listings.length})`;
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(msg)}`;
}

export async function shareNative(listings: Listing[]): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.share) return false;
  try {
    const msg = buildShareMessage(listings);
    await navigator.share({
      title: `Property recommendations from Chariot Realty (${listings.length})`,
      text: msg,
    });
    return true;
  } catch {
    return false;
  }
}

export function copyShareLink(listings: Listing[]): string {
  return buildShareMessage(listings);
}

export function shareToTwitter(listings: Listing[]): string {
  const msg = buildShareMessage(listings);
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(msg.slice(0, 280))}`;
}

export function shareToLinkedIn(listings: Listing[]): string {
  const msg = buildShareMessage(listings);
  const url = `https://chariotrealty.in/properties/${listings[0].slug}`;
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&title=${encodeURIComponent("Property from Chariot Realty")}&summary=${encodeURIComponent(msg.slice(0, 500))}`;
}

export function shareToFacebook(listings: Listing[]): string {
  const url = `https://chariotrealty.in/properties/${listings[0].slug}`;
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}
