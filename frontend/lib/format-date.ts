/**
 * Shared date/time formatting utilities.
 * Consolidated from duplicated formatDate/formatTime definitions across
 * admin, sales, and staff dashboards.
 */

/**
 * Format a date string to en-NG locale date (DD/MM/YYYY).
 * Uses the user's local timezone for accurate display.
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-NG', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
}

/**
 * Format a date string to en-NG locale time (HH:MM AM/PM).
 * Uses the user's local timezone for accurate display.
 */
export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-NG', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
}

/**
 * Alias for formatDate — used in receipt-related pages.
 * Same implementation, different name for semantic clarity.
 */
export const formatReceiptDate = formatDate;

/**
 * Alias for formatTime — used in receipt-related pages.
 */
export const formatReceiptTime = formatTime;

/**
 * Format a date string to a long-form date display (e.g., "May 27, 2026").
 */
export function formatDateShort(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a date string to date + time long display (e.g., "May 27, 2026, 12:00 PM").
 */
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
