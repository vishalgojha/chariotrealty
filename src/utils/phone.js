export function normalizePhone(input) {
  const digits = String(input || "").replace(/\D/g, "");
  if (!digits) {
    return "";
  }

  if (digits.length > 10 && digits.startsWith("91")) {
    return digits.slice(-10);
  }

  return digits.slice(-10);
}
