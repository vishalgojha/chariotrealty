import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/leads/admin";

export const dynamic = "force-dynamic";

const LISTING_TABLES = [
  "chariot_residential_sale_listings",
  "chariot_residential_rent_listings",
  "chariot_commercial_sale_listings",
  "chariot_commercial_rent_listings",
];

function supabaseConfig() {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return { url, key };
}

async function restGet(rest: { url: string; key: string }, resource: string, query: URLSearchParams, countExact = false) {
  const headers: Record<string, string> = { apikey: rest.key, Authorization: `Bearer ${rest.key}` };
  if (countExact) headers["Prefer"] = "count=exact";
  const response = await fetch(`${rest.url}/rest/v1/${resource}?${query.toString()}`, { headers, cache: "no-store" });
  if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
  const contentRange = response.headers.get("content-range") || "";
  const total = contentRange.includes("/") ? Number(contentRange.split("/")[1]) || 0 : 0;
  return { rows: (await response.json()) as Record<string, any>[], total };
}

export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const { url, key } = supabaseConfig();
  if (!url || !key) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });

  const brokerId = process.env.CHARIOT_WHATSAPP_BROKER_ID || "";
  if (!brokerId) {
    return NextResponse.json({ error: "CHARIOT_WHATSAPP_BROKER_ID is not configured" }, { status: 503 });
  }

  const { searchParams } = request.nextUrl;
  const limit = Math.min(Number(searchParams.get("limit") || "50"), 100);
  const offset = Math.max(Number(searchParams.get("offset") || "0"), 0);
  const query = searchParams.get("q") || "";
  const status = searchParams.get("status") || "";
  const scope = searchParams.get("scope") || "";

  const list = new URLSearchParams();
  list.set("select", "*");
  list.set("broker_id", `eq.${brokerId}`);
  list.set("order", "message_timestamp.desc");
  list.set("limit", String(limit));
  list.set("offset", String(offset));
  // Group traffic dwarfs direct chats, so the admin needs a way to narrow the
  // capture down to the owner's own messages instead of paging through them.
  const ownerPhone = (process.env.CHARIOT_WHATSAPP_SELF_JID || "").split("@")[0]?.split(":")[0] || "919773757759";
  if (scope === "owner" || scope === "owner_direct") {
    list.set("sender_phone", `ilike.*${ownerPhone}*`);
  }
  if (scope === "direct" || scope === "owner_direct") {
    list.set("is_group", "eq.false");
  }
  if (scope === "groups") {
    list.set("is_group", "eq.true");
  }
  if (query) {
    const needle = query.replace(/[%,()]/g, "");
    // Some ingested messages keep their text in raw_payload while the
    // normalized message column is empty. Search both representations so
    // the admin filter behaves consistently for text and media captions.
    list.set(
      "or",
      `(message.ilike.*${needle}*,sender.ilike.*${needle}*,group_name.ilike.*${needle}*,raw_payload->>conversation.ilike.*${needle}*,raw_payload->>text.ilike.*${needle}*,raw_payload->>caption.ilike.*${needle}*,raw_payload->>body.ilike.*${needle}*)`,
    );
  }

  let messages: Record<string, any>[] = [];
  let total = 0;
  try {
    ({ rows: messages, total } = await restGet({ url, key }, "chariot_whatsapp_messages", list, true));
  } catch (error) {
    return NextResponse.json({ error: `Could not read WhatsApp messages` }, { status: 502 });
  }

  const messageIds = messages.map((row) => Number(row.id)).filter((id) => Number.isFinite(id));
  const extractedMap: Record<string, { id: number; table: string; status: string }[]> = {};

  if (messageIds.length) {
    for (const table of LISTING_TABLES) {
      const lookup = new URLSearchParams();
      lookup.set("select", "id,raw_message_id,status");
      lookup.set("raw_message_id", `in.(${messageIds.join(",")})`);
      try {
        const { rows } = await restGet({ url, key }, table, lookup);
        for (const row of rows) {
          const keyId = String(row.raw_message_id);
          if (!extractedMap[keyId]) extractedMap[keyId] = [];
          extractedMap[keyId].push({
            id: Number(row.id),
            table: table.replace("chariot_", "").replace("_listings", ""),
            status: String(row.status || ""),
          });
        }
      } catch {
        // Listing tables may not exist yet; extraction status is best-effort.
      }
    }
  }

  const filtered =
    status === "extracted"
      ? messages.filter((row) => extractedMap[String(row.id)]?.length)
      : status === "none"
        ? messages.filter((row) => !extractedMap[String(row.id)]?.length)
        : messages;

  return NextResponse.json({ messages: filtered, total, extractedMap });
}
