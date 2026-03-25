import { createClient } from "@supabase/supabase-js";
import { env, isSupabaseConfigured } from "./env.js";

export const supabase = isSupabaseConfigured()
  ? createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

export function requireSupabase() {
  if (!supabase) {
    throw new Error("Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }

  return supabase;
}
