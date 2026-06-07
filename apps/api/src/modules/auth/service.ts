import { randomUUID } from 'node:crypto';
import { ShopStatus, SubscriptionStatus, User, UserRole } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { TRIAL_DAYS } from '../../config/constants';
import { ConflictError, NotFoundError, UnauthorizedError } from '../../utils/AppError';
import { DUMMY_PASSWORD_HASH, hashPassword, verifyPassword } from '../../utils/password';
import { maskShop } from '../../utils/kyc';
import { generateRefreshToken, hashToken, signAccessToken } from '../../utils/jwt';
import { refreshTokenRepository, userRepository } from './repository';
import type { CreateStaffInput, LoginInput, RegisterInput } from './validators';
import type { AuthTokens, LoginResult, RequestMeta, SafeUser } from './types';

function toSafeUser(user: User): SafeUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    shopId: user.shopId,
    isActive: user.isActive,
  };
}

class AuthService {
  private async issueTokens(
    user: Pick<User, 'id' | 'role' | 'shopId'>,
    meta?: RequestMeta,
    familyId?: string,
  ): Promise<{ tokens: AuthTokens; tokenId: string }> {
    const accessToken = signAccessToken({ sub: user.id, role: user.role, shopId: user.shopId });
    const refresh = generateRefreshToken();
    const created = await refreshTokenRepository.create({
      userId: user.id,
      tokenHash: refresh.tokenHash,
      familyId: familyId ?? randomUUID(),
      expiresAt: refresh.expiresAt,
      userAgent: meta?.userAgent,
      ipAddress: meta?.ipAddress,
    });
    return { tokens: { accessToken, refreshToken: refresh.token }, tokenId: created.id };
  }

  /** Registers an owner + their (pending) shop atomically, then auto-logs in. */
  async register(input: RegisterInput, meta?: RequestMeta): Promise<LoginResult> {
    const email = input.owner.email.toLowerCase();
    if (await userRepository.existsByEmail(email)) {
      throw new ConflictError('An account with this email already exists');
    }
    const passwordHash = await hashPassword(input.owner.password);

    const owner = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, passwordHash, fullName: input.owner.fullName, role: UserRole.shop_owner },
      });
      const shop = await tx.shop.create({
        data: {
          name: input.shop.name,
          licenseNumber: input.shop.licenseNumber,
          address: input.shop.address,
          city: input.shop.city,
          state: input.shop.state,
          postalCode: input.shop.postalCode,
          phone: input.shop.phone,
          gstNumber: input.shop.gstNumber,
          aadhaarNumber: input.shop.aadhaarNumber,
          panNumber: input.shop.panNumber,
          ownerUserId: user.id,
          status: ShopStatus.pending,
          subscriptionStatus: SubscriptionStatus.trialing,
          trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000),
        },
      });
      return tx.user.update({ where: { id: user.id }, data: { shopId: shop.id } });
    });

    const { tokens } = await this.issueTokens(owner, meta);
    return { user: toSafeUser(owner), tokens };
  }

  async login(input: LoginInput, meta?: RequestMeta): Promise<LoginResult> {
    const user = await userRepository.findByEmail(input.email.toLowerCase());
    // Always run a bcrypt comparison (against a dummy hash when the user is
    // missing) so the response time never reveals whether the email exists.
    const passwordOk = await verifyPassword(input.password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
    if (!user || !user.isActive || !passwordOk) {
      throw new UnauthorizedError('Invalid credentials');
    }
    const { tokens } = await this.issueTokens(user, meta);
    return { user: toSafeUser(user), tokens };
  }

  /**
   * Rotating refresh with reuse detection. If a presented token is already
   * revoked, or another request rotated it first, the entire session family is
   * revoked (assumed token theft) and the caller must re-authenticate.
   */
  async refresh(rawToken: string, meta?: RequestMeta): Promise<AuthTokens> {
    const presented = await refreshTokenRepository.findByHash(hashToken(rawToken));
    if (!presented) {
      throw new UnauthorizedError('Invalid session');
    }
    if (presented.revokedAt) {
      await refreshTokenRepository.revokeFamily(presented.familyId);
      throw new UnauthorizedError('Session reuse detected; all sessions were revoked');
    }
    if (presented.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedError('Session expired');
    }

    const user = await userRepository.findById(presented.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedError('Account is inactive');
    }

    // Mint the replacement (same family), then atomically retire the old token.
    const { tokens, tokenId } = await this.issueTokens(user, meta, presented.familyId);
    const revoked = await refreshTokenRepository.revokeIfActive(presented.id, tokenId);
    if (revoked === 0) {
      // Lost the race with a concurrent refresh -> treat as reuse.
      await refreshTokenRepository.revokeFamily(presented.familyId);
      throw new UnauthorizedError('Concurrent session reuse detected; all sessions were revoked');
    }
    return tokens;
  }

  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;
    const record = await refreshTokenRepository.findActiveByHash(hashToken(rawToken));
    if (record) {
      await refreshTokenRepository.revoke(record.id);
    }
  }

  async me(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        shop: {
          include: {
            plan: true,
            // Owner identity travels with the shop so the POS can print a
            // complete pharmacy invoice header (owner name + contact email).
            owner: { select: { id: true, fullName: true, email: true } },
          },
        },
      },
    });
    if (!user) {
      throw new NotFoundError('User not found');
    }
    const { passwordHash: _passwordHash, ...safe } = user;
    // Mask sensitive KYC identifiers on the shop embedded in /auth/me — this
    // response goes to owners AND staff. Full values are only ever exposed on
    // the central-admin verification endpoints.
    return safe.shop ? { ...safe, shop: maskShop(safe.shop) } : safe;
  }

  async createStaff(shopId: string, input: CreateStaffInput): Promise<SafeUser> {
    const email = input.email.toLowerCase();
    if (await userRepository.existsByEmail(email)) {
      throw new ConflictError('An account with this email already exists');
    }
    const passwordHash = await hashPassword(input.password);
    const staff = await userRepository.create({
      email,
      passwordHash,
      fullName: input.fullName,
      role: UserRole.shop_staff,
      shopId,
    });
    return toSafeUser(staff);
  }
}

export const authService = new AuthService();
