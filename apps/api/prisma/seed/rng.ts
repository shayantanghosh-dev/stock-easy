/**
 * Deterministic PRNG (mulberry32) so the demo data is reproducible run-to-run.
 * Seed it from SEED_RNG to vary the dataset. No crypto — predictability is the point.
 */
export class Rng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** Float in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /** Float in [min, max] rounded to `dp` decimals. */
  float(min: number, max: number, dp = 2): number {
    const factor = 10 ** dp;
    return Math.round((this.next() * (max - min) + min) * factor) / factor;
  }

  /** True with probability p. */
  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(arr: readonly T[]): T {
    return arr[this.int(0, arr.length - 1)]!;
  }

  shuffle<T>(arr: readonly T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i -= 1) {
      const j = this.int(0, i);
      [a[i], a[j]] = [a[j]!, a[i]!];
    }
    return a;
  }

  /** `n` distinct items from `arr` (or all of them if n exceeds length). */
  pickN<T>(arr: readonly T[], n: number): T[] {
    return this.shuffle(arr).slice(0, Math.min(n, arr.length));
  }

  /** Weighted choice from [item, weight] pairs. */
  weighted<T>(pairs: ReadonlyArray<readonly [T, number]>): T {
    const total = pairs.reduce((sum, [, w]) => sum + w, 0);
    let roll = this.next() * total;
    for (const [item, w] of pairs) {
      roll -= w;
      if (roll <= 0) return item;
    }
    return pairs[pairs.length - 1]![0];
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

export function daysAgo(days: number): Date {
  return new Date(Date.now() - days * DAY_MS);
}

/** Truncate a Date to midnight UTC — used for batch expiry (DATE column). */
export function dateOnly(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** Clamp a date so it never exceeds `now`. */
export function clampToNow(date: Date): Date {
  const now = Date.now();
  return date.getTime() > now ? new Date(now) : date;
}
