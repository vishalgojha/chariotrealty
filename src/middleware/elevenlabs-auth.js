import { env } from "../config/env.js";
import { verifyElevenLabsSignature } from "../utils/elevenlabs-signature.js";

export function elevenLabsAuth(req, res, next) {
  const isWebhookRoute = req.path === "/post-call" || req.path === "/client-data";
  const signatureHeader = req.headers["elevenlabs-signature"] || req.headers["elevenlabs-signature-v2"] || "";
  const rawBody = req.rawBody || "";

  if (
    isWebhookRoute &&
    env.elevenLabsWebhookSecrets.length > 0 &&
    signatureHeader &&
    verifyElevenLabsSignature({
      rawBody,
      signatureHeader,
      secrets: env.elevenLabsWebhookSecrets,
      toleranceSeconds: env.elevenLabsWebhookToleranceSeconds
    })
  ) {
    next();
    return;
  }

  if (!env.elevenLabsToolSecret) {
    next();
    return;
  }

  const authHeader = req.headers.authorization || "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const headerSecret = req.headers["x-chariot-secret"] || req.headers["x-elevenlabs-secret"] || "";

  if (bearerToken === env.elevenLabsToolSecret || headerSecret === env.elevenLabsToolSecret) {
    next();
    return;
  }

  res.status(401).json({
    error: "Unauthorized"
  });
}
