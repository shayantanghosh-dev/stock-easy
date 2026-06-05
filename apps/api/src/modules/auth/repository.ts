import { Prisma, User } from '@prisma/client';
import { prisma } from '../../lib/prisma';

/**
 * Owns the `users` table. Lives in the auth module but is exported so other
 * modules (e.g. admin) can read users without duplicating queries.
 */
export class UserRepository {
  findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  async existsByEmail(email: string): Promise<boolean> {
    return (await prisma.user.count({ where: { email } })) > 0;
  }

  create(data: Prisma.UserUncheckedCreateInput, db: Prisma.TransactionClient = prisma): Promise<User> {
    return db.user.create({ data });
  }

  update(
    id: string,
    data: Prisma.UserUncheckedUpdateInput,
    db: Prisma.TransactionClient = prisma,
  ): Promise<User> {
    return db.user.update({ where: { id }, data });
  }
}

export const userRepository = new UserRepository();

export interface CreateRefreshTokenData {
  userId: string;
  tokenHash: string;
  familyId: string;
  expiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
}

export class RefreshTokenRepository {
  create(data: CreateRefreshTokenData) {
    return prisma.refreshToken.create({ data });
  }

  /** Lookup by hash regardless of status — needed to detect reuse of a revoked token. */
  findByHash(tokenHash: string) {
    return prisma.refreshToken.findUnique({ where: { tokenHash } });
  }

  findActiveByHash(tokenHash: string) {
    return prisma.refreshToken.findFirst({
      where: { tokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
    });
  }

  revoke(id: string) {
    return prisma.refreshToken.update({ where: { id }, data: { revokedAt: new Date() } });
  }

  /**
   * Atomically revoke a token only if still active. Returns the number of rows
   * affected (0 => someone already rotated it, i.e. a concurrent reuse).
   */
  async revokeIfActive(id: string, replacedById?: string): Promise<number> {
    const res = await prisma.refreshToken.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: new Date(), replacedById },
    });
    return res.count;
  }

  /** Revoke every active token in a session family (breach response). */
  revokeFamily(familyId: string) {
    return prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}

export const refreshTokenRepository = new RefreshTokenRepository();
