import { clientEnv } from "./env";

/**
 * The Stock Easy money contract.
 *
 * The API serialises every monetary value as a fixed two-decimal STRING
 * (e.g. "1234.50"), computed server-side with Decimal half-up rounding. The
 * frontend therefore:
 *
 *   • Never performs authoritative financial math — backend totals win.
 *   • Does integer minor-unit (paise/cent) arithmetic only for cart *previews*,
 *     so the displayed estimate cannot drift via IEEE-754 floats.
 *   • Formats consistently for display.
 */

export type MoneyString = string;

/** Parse a money string/number into integer minor units (2dp), half-up. */
export function toMinorUnits(value: MoneyString | number): number {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return 0;
  // Round half-up at 2dp, guarding against float representation error.
  return Math.round((num + Number.EPSILON) * 100);
}

/** Render integer minor units back into a canonical "x.xx" string. */
export function fromMinorUnits(minor: number): MoneyString {
  const sign = minor < 0 ? "-" : "";
  const abs = Math.abs(minor);
  const whole = Math.floor(abs / 100);
  const frac = (abs % 100).toString().padStart(2, "0");
  return `${sign}${whole}.${frac}`;
}

/** Preview-only: unit price × quantity as a money string. */
export function multiplyMoney(unit: MoneyString | number, qty: number): MoneyString {
  return fromMinorUnits(toMinorUnits(unit) * Math.trunc(qty));
}

/** Preview-only: sum a list of money strings. */
export function sumMoney(values: Array<MoneyString | number>): MoneyString {
  return fromMinorUnits(values.reduce<number>((acc, v) => acc + toMinorUnits(v), 0));
}

/** Preview-only: a − b as a money string (clamped at zero when requested). */
export function subtractMoney(
  a: MoneyString | number,
  b: MoneyString | number,
  clampZero = false,
): MoneyString {
  const diff = toMinorUnits(a) - toMinorUnits(b);
  return fromMinorUnits(clampZero ? Math.max(0, diff) : diff);
}

/** Preview-only: percentage of a base (e.g. GST). */
export function percentOf(base: MoneyString | number, ratePercent: MoneyString | number): MoneyString {
  const minor = toMinorUnits(base) * Number(ratePercent);
  return fromMinorUnits(Math.round(minor / 100));
}

export interface FormatMoneyOptions {
  /** Show the currency symbol (default true). */
  symbol?: boolean;
  /** Override the currency symbol. */
  currency?: string;
}

/**
 * Format a money string/number for display with thousands separators and a
 * currency symbol — e.g. "₹1,234.50".
 */
export function formatMoney(
  value: MoneyString | number | null | undefined,
  options: FormatMoneyOptions = {},
): string {
  const { symbol = true, currency = clientEnv.currency } = options;
  if (value === null || value === undefined || value === "") return symbol ? `${currency}0.00` : "0.00";
  const minor = toMinorUnits(value);
  const negative = minor < 0;
  const formatted = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(minor) / 100);
  const sign = negative ? "-" : "";
  return `${sign}${symbol ? currency : ""}${formatted}`;
}

/** Compact money for tight KPI tiles — e.g. "₹1.4L", "₹2.3K". */
export function formatMoneyCompact(value: MoneyString | number | null | undefined): string {
  const currency = clientEnv.currency;
  const num = toMinorUnits(value ?? 0) / 100;
  const abs = Math.abs(num);
  if (abs >= 1_00_00_000) return `${currency}${(num / 1_00_00_000).toFixed(1)}Cr`;
  if (abs >= 1_00_000) return `${currency}${(num / 1_00_000).toFixed(1)}L`;
  if (abs >= 1_000) return `${currency}${(num / 1_000).toFixed(1)}K`;
  return formatMoney(num);
}
