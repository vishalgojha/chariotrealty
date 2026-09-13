type MumbaiLead = {
  name: string;
  phone: string;
  email: string | null;
  intent: string;
  locality: string | null;
  propertyId: string | null;
  message: string | null;
  source: string;
};

export async function saveMumbaiLead(lead: MumbaiLead): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { ok: false, error: "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required" };

  const response = await fetch(`${url}/rest/v1/chariot_leads`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      intent: lead.intent,
      locality: lead.locality,
      property_id: lead.propertyId,
      message: lead.message,
      source: lead.source,
      city: "Mumbai",
    }),
    cache: "no-store",
  });

  if (!response.ok) return { ok: false, error: `Supabase returned ${response.status}` };
  const rows = await response.json() as Array<{ id: string }>;
  return { ok: true, id: rows[0]?.id ?? "accepted" };
}
