import { env } from "../config/env.js";
import { requireSupabase } from "../config/supabase.js";
import { normalizePhone } from "../utils/phone.js";
import { upsertLead } from "./lead-service.js";

function requireData(data, error, context) {
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }
  return data;
}

export async function seedKnownContacts() {
  const supabase = requireSupabase();
  const contacts = [
    {
      phone: normalizePhone(env.kapilPhone),
      name: env.kapilName,
      role: "owner"
    }
  ];

  const { error } = await supabase.from("contacts").upsert(contacts, {
    onConflict: "phone"
  });

  if (error) {
    throw new Error(`Unable to seed contacts: ${error.message}`);
  }
}

export async function getContactByPhone(phone) {
  const supabase = requireSupabase();
  const normalizedPhone = normalizePhone(phone);
  if (normalizedPhone === normalizePhone(env.systemNumber)) {
    return {
      phone: normalizedPhone,
      name: "System Number",
      role: "system"
    };
  }

  const { data, error } = await supabase
    .from("contacts")
    .select("phone, name, role")
    .eq("phone", normalizedPhone)
    .maybeSingle();

  return requireData(data, error, "Failed to fetch contact");
}

export async function resolveContact({ phone, name, source = "direct" }) {
  const supabase = requireSupabase();
  const normalizedPhone = normalizePhone(phone);

  if (normalizedPhone === normalizePhone(env.systemNumber)) {
    return {
      phone: normalizedPhone,
      name: "System Number",
      role: "system",
      source: "system"
    };
  }

  const existing = await getContactByPhone(normalizedPhone);
  if (existing) {
    if (!existing.name && name) {
      await supabase.from("contacts").upsert(
        {
          phone: normalizedPhone,
          name,
          role: existing.role
        },
        { onConflict: "phone" }
      );

      return { ...existing, name };
    }

    return existing;
  }

  const leadName = name || "Unknown Lead";
  const insertPayload = {
    phone: normalizedPhone,
    name: leadName,
    role: "lead"
  };

  const { error } = await supabase.from("contacts").insert(insertPayload);
  if (error) {
    throw new Error(`Failed to create contact: ${error.message}`);
  }

  await upsertLead({
    phone: normalizedPhone,
    name: leadName,
    status: "new",
    source
  });

  return insertPayload;
}
