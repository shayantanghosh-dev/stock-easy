import bcrypt from 'bcryptjs';
import { env } from '../config/env';

/**
 * Password hashing. bcryptjs is pure-JS (no native build) and matches the seed.
 * For higher security in production, argon2id is a drop-in swap behind these two
 * functions — nothing else in the codebase needs to change.
 */
export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, env.BCRYPT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * A precomputed hash of a random string. Login compares against this when the
 * email is unknown, so the response time is the same whether or not the user
 * exists — closing the timing side-channel for user enumeration.
 */
export const DUMMY_PASSWORD_HASH = bcrypt.hashSync(
  'stock-easy-constant-time-placeholder-7f3a1c',
  env.BCRYPT_ROUNDS,
);
