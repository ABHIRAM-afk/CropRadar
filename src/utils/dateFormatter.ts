/**
 * Crop Radar Date & Time Formatting Utilities
 *
 * Rules:
 * - Timestamps are stored and transmitted in UTC (ISO-8601).
 * - Timestamps are formatted dynamically in the user's local timezone.
 * - No hardcoded manual hour/minute offsets.
 * - Example: UTC 04:07 AM (2026-11-09T04:07:00.000Z) displays as 09:37 AM in India (Asia/Kolkata).
 */

/**
 * Formats an ISO-8601 UTC timestamp string or Date object to the user's local time (e.g. "09:37 AM").
 */
export function formatLocalTime(
  isoStringOrDate?: string | Date | null,
  locale?: string
): string {
  if (!isoStringOrDate) return '';
  const date = typeof isoStringOrDate === 'string' ? new Date(isoStringOrDate) : isoStringOrDate;
  if (isNaN(date.getTime())) {
    return String(isoStringOrDate);
  }
  return date.toLocaleTimeString(locale || undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Formats an ISO-8601 UTC timestamp string or Date object to the user's local date and time
 * (e.g. "09 Nov 2026, 09:37 AM").
 */
export function formatLocalDateTime(
  isoStringOrDate?: string | Date | null,
  locale?: string
): string {
  if (!isoStringOrDate) return '';
  const date = typeof isoStringOrDate === 'string' ? new Date(isoStringOrDate) : isoStringOrDate;
  if (isNaN(date.getTime())) {
    return String(isoStringOrDate);
  }
  return date.toLocaleString(locale || undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Formats a timestamp into a consistent display for radar side panel and popups.
 */
export function formatEventOccurrence(
  isoStringOrDate?: string | Date | null,
  locale?: string
): { time: string; full: string } {
  return {
    time: formatLocalTime(isoStringOrDate, locale),
    full: formatLocalDateTime(isoStringOrDate, locale),
  };
}

