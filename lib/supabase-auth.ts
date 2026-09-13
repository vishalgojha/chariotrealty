type SupabaseUser = { id: string; email?: string; user_metadata?: Record<string, unknown> };

function authConfig() {
  return {
    url: (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, ""),
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "",
  };
}

export async function signInWithPassword(email: string, password: string) {
  const { url, anonKey } = authConfig();
  if (!url || !anonKey) throw new Error("Supabase Auth is not configured");
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error_description || payload.msg || "Supabase login failed");
  return payload;
}

export async function getSupabaseUser(accessToken: string): Promise<SupabaseUser | null> {
  const { url, anonKey } = authConfig();
  if (!url || !anonKey || !accessToken) return null;
  const response = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  if (!response.ok) return null;
  return response.json();
}

export function isAllowedSupabaseAdmin(user: SupabaseUser) {
  const allowed = (process.env.SUPABASE_ADMIN_EMAILS || process.env.SUPABASE_ADMIN_EMAIL || process.env.CHARIOT_OWNER_EMAIL || "")
    .split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);
  return Boolean(user.email && allowed.includes(user.email.toLowerCase()));
}
