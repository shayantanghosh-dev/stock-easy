/** Local midnight today — used for date-only comparisons (e.g. expiry). */
export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

/** Midnight today + N days. */
export function daysFromNow(days: number): Date {
  return addDays(startOfToday(), days);
}
