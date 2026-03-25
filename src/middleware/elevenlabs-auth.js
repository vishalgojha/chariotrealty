import { env } from "../config/env.js";

export function elevenLabsAuth(req, res, next) {
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
