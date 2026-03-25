import { requireSupabase } from "../config/supabase.js";
import { normalizePhone } from "../utils/phone.js";
import { toIsoString } from "../utils/time.js";

export async function saveConversation({ phone, role, message, sender, timestamp }) {
  const supabase = requireSupabase();
  const { error } = await supabase.from("conversations").insert({
    phone: normalizePhone(phone),
    role,
    message,
    sender,
    timestamp: timestamp || toIsoString()
  });

  if (error) {
    throw new Error(`Failed to save conversation: ${error.message}`);
  }
}

export async function getConversationHistory(phone, limit = 10) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("conversations")
    .select("id, phone, role, message, sender, timestamp")
    .eq("phone", normalizePhone(phone))
    .order("timestamp", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch conversations: ${error.message}`);
  }

  return data || [];
}
