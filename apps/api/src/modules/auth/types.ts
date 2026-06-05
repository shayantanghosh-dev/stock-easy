import type { UserRole } from '@prisma/client';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface SafeUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  shopId: string | null;
  isActive: boolean;
}

export interface LoginResult {
  user: SafeUser;
  tokens: AuthTokens;
}

/** Optional request metadata stored alongside a refresh token. */
export interface RequestMeta {
  userAgent?: string;
  ipAddress?: string;
}
