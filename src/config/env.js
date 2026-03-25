import dotenv from "dotenv";

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 3000),
  whatsappToken: process.env.WHATSAPP_TOKEN || "",
  whatsappPhoneId: process.env.WHATSAPP_PHONE_ID || "",
  whatsappVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN || "",
  elevenLabsApiKey: process.env.ELEVENLABS_API_KEY || "",
  elevenLabsAgentId: process.env.ELEVENLABS_AGENT_ID || "",
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  kapilPhone: process.env.KAPIL_PHONE || "9773757759",
  kapilName: "Kapil",
  systemNumber: process.env.SYSTEM_NUMBER || "9137833547",
  sessionTimeoutMinutes: Number(process.env.SESSION_TIMEOUT_MINUTES || 10)
};

export function isWhatsAppConfigured() {
  return Boolean(env.whatsappToken && env.whatsappPhoneId);
}

export function isElevenLabsConfigured() {
  return Boolean(env.elevenLabsApiKey && env.elevenLabsAgentId);
}

export function isSupabaseConfigured() {
  return Boolean(env.supabaseUrl && env.supabaseServiceRoleKey);
}
