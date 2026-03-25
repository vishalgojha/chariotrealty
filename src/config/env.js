import dotenv from "dotenv";

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 3000),
  elevenLabsApiKey: process.env.ELEVENLABS_API_KEY || "",
  elevenLabsAgentId: process.env.ELEVENLABS_AGENT_ID || "",
  elevenLabsToolSecret: process.env.ELEVENLABS_TOOL_SECRET || "",
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  kapilPhone: process.env.KAPIL_PHONE || "9773757759",
  kapilName: "Kapil",
  systemNumber: process.env.SYSTEM_NUMBER || "9137833547",
  sessionTimeoutMinutes: Number(process.env.SESSION_TIMEOUT_MINUTES || 10)
};

export function isElevenLabsConfigured() {
  return Boolean(env.elevenLabsApiKey && env.elevenLabsAgentId);
}

export function isSupabaseConfigured() {
  return Boolean(env.supabaseUrl && env.supabaseServiceRoleKey);
}
