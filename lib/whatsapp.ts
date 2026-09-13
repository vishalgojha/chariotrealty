import { mumbaiProperties } from "@/lib/mumbai";

type GatewayStatus = { connected?: boolean; connection_state?: string; phone_number?: string; qr?: string; qr_available?: boolean; [key: string]: unknown };

function config() {
  return {
    baseUrl: (process.env.CHARIOT_WHATSAPP_INGESTOR_URL || "").replace(/\/$/, ""),
    token: process.env.CHARIOT_WHATSAPP_INTERNAL_TOKEN || "",
    brokerId: process.env.CHARIOT_WHATSAPP_BROKER_ID || "chariot-realty",
    selfJid: process.env.CHARIOT_WHATSAPP_SELF_JID || "",
  };
}

async function gateway(path: string, init: RequestInit = {}) {
  const { baseUrl, token, brokerId } = config();
  if (!baseUrl || !token) throw new Error("WhatsMeow gateway is not configured");
  const headers = new Headers(init.headers);
  headers.set("X-PropAI-Internal-Token", token);
  headers.set("X-Broker-Id", brokerId);
  return fetch(`${baseUrl}${path}`, { ...init, headers, cache: "no-store" });
}

export async function whatsappStatus(): Promise<GatewayStatus> {
  const { brokerId } = config();
  const response = await gateway(`/health?broker_id=${encodeURIComponent(brokerId)}`);
  if (!response.ok) throw new Error(`WhatsMeow status returned ${response.status}`);
  return response.json();
}

export async function connectWhatsapp() {
  const response = await gateway("/connect", { method: "POST" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `WhatsMeow connect returned ${response.status}`);
  return payload;
}

export async function startWhatsappPairing() {
  const { selfJid } = config();
  const phone = selfJid.split("@")[0]?.split(":")[0] || "";
  if (!phone) throw new Error("CHARIOT_WHATSAPP_SELF_JID is not configured");
  const response = await gateway("/pair-code/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone }) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `WhatsMeow pairing returned ${response.status}`);
  return payload;
}

export async function resetWhatsapp() {
  const response = await gateway("/reset", { method: "POST" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `WhatsMeow reset returned ${response.status}`);
  return payload;
}

export async function publishOwnProperty(propertyId: string, confirm: boolean) {
  const property = mumbaiProperties.find((item) => item.id === propertyId);
  if (!property) throw new Error("Only Chariot-owned properties can be published");
  if (!property.image) throw new Error("This property does not have a publishable image");
  const { selfJid, brokerId } = config();
  if (!selfJid) throw new Error("CHARIOT_WHATSAPP_SELF_JID is not configured");

  const caption = `${property.name}\n${property.location}\n${property.price}\n${property.configuration ? `${property.configuration} · ` : ""}${property.carpetAreaSqft.toLocaleString("en-IN")} sqft\n\nChariot Realty · Mumbai`;
  if (!confirm) return { dryRun: true, property: { id: property.id, name: property.name, image: property.image }, target: "configured self-chat", caption };

  const textResponse = await gateway("/send-message", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ brokerId, remoteJid: selfJid, text: caption }) });
  if (!textResponse.ok) throw new Error(`WhatsMeow text send returned ${textResponse.status}`);

  const imageResponse = await fetch(property.image);
  if (!imageResponse.ok) throw new Error("Property image could not be downloaded");
  const image = await imageResponse.arrayBuffer();
  const mimeType = imageResponse.headers.get("content-type") || "image/jpeg";
  const form = new FormData();
  form.append("brokerId", brokerId);
  form.append("remoteJid", selfJid);
  form.append("mediaType", "image");
  form.append("mimeType", mimeType);
  form.append("fileName", `${property.slug}.jpg`);
  form.append("caption", caption);
  form.append("file", new Blob([image], { type: mimeType }), `${property.slug}.jpg`);
  const mediaResponse = await gateway("/send-media", { method: "POST", body: form });
  if (!mediaResponse.ok) throw new Error(`WhatsMeow image send returned ${mediaResponse.status}`);
  return { sent: true, property: { id: property.id, name: property.name }, target: "configured self-chat", response: await mediaResponse.json() };
}

export function whatsappConfigStatus() {
  const { baseUrl, token, selfJid } = config();
  return { configured: Boolean(baseUrl && token && selfJid), gatewayConfigured: Boolean(baseUrl && token), selfChatConfigured: Boolean(selfJid), brokerId: config().brokerId };
}
