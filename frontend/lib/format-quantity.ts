/**
 * Formats a numeric quantity for display using fraction notation.
 * - Whole numbers show as-is: 1, 2, 3
 * - 0.5 shows as ½
 * - 1.5 shows as 1½, 2.5 shows as 2½, etc.
 *
 * Used across make-sale pages, receipts, and inventory displays.
 */
export function formatQty(qty: number): string {
  if (qty % 1 === 0) return qty.toString();
  const whole = Math.floor(qty);
  return whole === 0 ? '½' : `${whole}½`;
}

/**
 * Formats a UTC timestamp string for local display.
 * Supabase returns timestamps without a timezone marker in some cases,
 * causing JS to parse them as local time instead of UTC.
 * This ensures the string is always treated as UTC before conversion.
 */
export function formatTimestamp(ts: string): string {
  // If the string already has a timezone indicator (Z or ±HH:MM), parse as-is.
  // Otherwise append 'Z' so JavaScript treats it as UTC.
  const normalized = /Z|[+-]\d{2}:?\d{2}$/.test(ts) ? ts : ts + 'Z';
  return new Date(normalized).toLocaleString();
}
