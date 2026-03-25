export function formatCurrency(value) {
  if (value == null || Number.isNaN(Number(value))) {
    return "NA";
  }

  const number = Number(value);
  if (number >= 10000000) {
    return `₹${(number / 10000000).toFixed(2)}Cr`;
  }

  if (number >= 100000) {
    return `₹${(number / 100000).toFixed(1)}L`;
  }

  return `₹${number.toLocaleString("en-IN")}`;
}
