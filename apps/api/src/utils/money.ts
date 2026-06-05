import { Prisma } from '@prisma/client';

export type Decimalish = Prisma.Decimal | number | string;

/**
 * The money contract for the whole API.
 *
 *  • Storage: PostgreSQL `numeric(12,2)` via Prisma `Decimal` (never floats).
 *  • Rounding: ROUND_HALF_UP at 2 decimal places, applied explicitly at every
 *    monetary step (line totals, subtotal, discount, GST, total).
 *  • Serialization: `Money.install()` makes every `Decimal` render as a fixed
 *    2-decimal string (e.g. "1.50") in all JSON responses — one enforcement
 *    point, so no endpoint can leak "1.5" or a raw Decimal object.
 *  • GST: tax-exclusive — `gst(base, rate%)` is added on top of the base.
 */
const SCALE = 2;
const ROUNDING = Prisma.Decimal.ROUND_HALF_UP;

export const Money = {
  SCALE,
  ROUNDING,

  of(value: Decimalish): Prisma.Decimal {
    return new Prisma.Decimal(value);
  },

  zero(): Prisma.Decimal {
    return new Prisma.Decimal(0);
  },

  /** Round to 2dp, half-up. Use after every multiply/divide. */
  round(value: Decimalish): Prisma.Decimal {
    return new Prisma.Decimal(value).toDecimalPlaces(SCALE, ROUNDING);
  },

  /** Canonical money string with exactly 2 decimals, e.g. "1.50". */
  format(value: Decimalish): string {
    return new Prisma.Decimal(value).toFixed(SCALE, ROUNDING);
  },

  isMoney(value: unknown): value is Prisma.Decimal {
    return Prisma.Decimal.isDecimal(value);
  },

  /** Tax-exclusive GST amount = round(base * rate / 100). */
  gst(base: Decimalish, ratePercent: Decimalish): Prisma.Decimal {
    return Money.round(new Prisma.Decimal(base).mul(new Prisma.Decimal(ratePercent)).div(100));
  },

  /**
   * Installs the response-serialization rule globally by overriding
   * Decimal#toJSON. Idempotent; call once during app startup.
   */
  install(): void {
    const proto = Prisma.Decimal.prototype as unknown as { toJSON?: () => string };
    proto.toJSON = function toJSON(this: Prisma.Decimal): string {
      return this.toFixed(SCALE, ROUNDING);
    };
  },
};
