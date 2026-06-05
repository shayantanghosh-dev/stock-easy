import { differenceInCalendarDays, format, formatDistanceToNowStrict, isValid, parseISO } from "date-fns";

function asDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = typeof value === "string" ? parseISO(value) : value;
  return isValid(date) ? date : null;
}

/** "12 Jun 2026" */
export function formatDate(value: string | Date | null | undefined): string {
  const date = asDate(value);
  return date ? format(date, "dd MMM yyyy") : "—";
}

/** "12 Jun 2026, 10:45 AM" */
export function formatDateTime(value: string | Date | null | undefined): string {
  const date = asDate(value);
  return date ? format(date, "dd MMM yyyy, h:mm a") : "—";
}

/** "Jun 2026" — used for expiry chips. */
export function formatMonthYear(value: string | Date | null | undefined): string {
  const date = asDate(value);
  return date ? format(date, "MMM yyyy") : "—";
}

/** "3 days ago", "in 2 months" */
export function formatRelative(value: string | Date | null | undefined): string {
  const date = asDate(value);
  return date ? formatDistanceToNowStrict(date, { addSuffix: true }) : "—";
}

/** Whole-number days until a date (negative = past). */
export function daysUntil(value: string | Date | null | undefined): number | null {
  const date = asDate(value);
  return date ? differenceInCalendarDays(date, new Date()) : null;
}

/** Thousands-separated integer — "1,200". */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "0";
  return new Intl.NumberFormat("en-IN").format(value);
}

/** "+1.2%", "-3.4%" with explicit sign. */
export function formatPercentDelta(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

/** Pluralise a noun by count — pluralize(2, "batch", "batches"). */
export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : plural ?? `${singular}s`;
}

/** Title-case a snake_case enum value — "partially_returned" -> "Partially Returned". */
export function humanizeEnum(value: string | null | undefined): string {
  if (!value) return "—";
  return value
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
