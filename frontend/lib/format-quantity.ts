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
