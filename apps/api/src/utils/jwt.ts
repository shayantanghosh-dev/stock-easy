import { createHash, randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { env } from '../config/env';

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
  shopId: string | null;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
  // jwt.verify returns string | JwtPayload; our tokens are always objects.
  return decoded as unknown as AccessTokenPayload;
}

export interface GeneratedRefreshToken {
  /** Opaque secret handed to the client (never stored in plaintext). */
  token: string;
  /** SHA-256 of the token — this is what we persist. */
  tokenHash: string;
  expiresAt: Date;
}

export function generateRefreshToken(): GeneratedRefreshToken {
  const token = randomBytes(48).toString('hex');
  return {
    token,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000),
  };
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
