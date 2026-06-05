import type { UserRole } from '@prisma/client';

/** Authenticated caller context derived from a verified access token. */
export interface AuthContext {
  userId: string;
  role: UserRole;
  /** null for central_admin (who has no shop). */
  shopId: string | null;
}
