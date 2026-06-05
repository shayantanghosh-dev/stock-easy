import { Prisma } from '@prisma/client';

/** JSON.stringify replacer that renders Prisma Decimals as strings (not objects). */
function decimalReplacer(_key: string, value: unknown): unknown {
  return Prisma.Decimal.isDecimal(value) ? value.toString() : value;
}

/** Serialize a value to JSON, safely handling Prisma Decimal columns. */
export function stringifySafe(value: unknown): string {
  return JSON.stringify(value, decimalReplacer);
}

/** Deep-clone a value into plain JSON-safe primitives (Decimals -> strings). */
export function toJsonSafe<T>(value: T): unknown {
  return JSON.parse(stringifySafe(value));
}
