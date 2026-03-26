import crypto from "crypto";

function parseSignature(signatureHeader = "") {
  const parts = String(signatureHeader)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const parsed = {};
  for (const part of parts) {
    const [key, value] = part.split("=");
    if (key && value) {
      parsed[key.trim()] = value.trim();
    }
  }

  return {
    timestamp: parsed.t || "",
    signature: parsed.v0 || ""
  };
}

function timingSafeEqualHex(a, b) {
  if (!a || !b || a.length !== b.length) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

export function verifyElevenLabsSignature({
  rawBody = "",
  signatureHeader = "",
  secrets = [],
  toleranceSeconds = 300
}) {
  const { timestamp, signature } = parseSignature(signatureHeader);
  if (!timestamp || !signature || !rawBody || !secrets.length) {
    return false;
  }

  const timestampNumber = Number(timestamp);
  if (Number.isFinite(timestampNumber) && toleranceSeconds > 0) {
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSeconds - timestampNumber) > toleranceSeconds) {
      return false;
    }
  }

  const signedPayload = `${timestamp}.${rawBody}`;
  for (const secret of secrets) {
    const expected = crypto
      .createHmac("sha256", secret)
      .update(signedPayload)
      .digest("hex");

    if (timingSafeEqualHex(expected, signature)) {
      return true;
    }
  }

  return false;
}
