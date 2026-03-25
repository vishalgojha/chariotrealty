import { env } from "../config/env.js";
import { requireSupabase } from "../config/supabase.js";
import { normalizePhone } from "../utils/phone.js";

function getExpiryThreshold() {
  return new Date(Date.now() - env.sessionTimeoutMinutes * 60 * 1000).toISOString();
}

export async function getSession(phone) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("sessions")
    .select("phone, last_active, active")
    .eq("phone", normalizePhone(phone))
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch session: ${error.message}`);
  }

  return data;
}

export async function touchSession(phone, active = true) {
  const supabase = requireSupabase();
  const payload = {
    phone: normalizePhone(phone),
    last_active: new Date().toISOString(),
    active
  };

  const { error } = await supabase.from("sessions").upsert(payload, {
    onConflict: "phone"
  });

  if (error) {
    throw new Error(`Failed to update session: ${error.message}`);
  }

  return payload;
}

export async function deactivateSession(phone) {
  const supabase = requireSupabase();
  const payload = {
    phone: normalizePhone(phone),
    last_active: new Date().toISOString(),
    active: false
  };

  const { error } = await supabase.from("sessions").upsert(payload, {
    onConflict: "phone"
  });

  if (error) {
    throw new Error(`Failed to deactivate session: ${error.message}`);
  }

  return payload;
}

export async function getOwnerSessionState(phone) {
  const session = await getSession(phone);
  if (!session) {
    return {
      active: false,
      expired: true
    };
  }

  const expired = !session.last_active || session.last_active < getExpiryThreshold();
  if (expired && session.active) {
    await deactivateSession(phone);
  }

  return {
    active: !expired && Boolean(session.active),
    expired
  };
}
