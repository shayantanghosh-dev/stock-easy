import { Request, Response } from 'express';
import { env, isProd } from '../../config/env';
import { REFRESH_COOKIE } from '../../config/constants';
import { UnauthorizedError } from '../../utils/AppError';
import { getAuth, getShopId } from '../../utils/context';
import { sendCreated, sendSuccess } from '../../utils/httpResponse';
import { authService } from './service';
import type { CreateStaffInput, LoginInput, RegisterInput } from './validators';
import type { RequestMeta } from './types';

function requestMeta(req: Request): RequestMeta {
  return { userAgent: req.headers['user-agent'], ipAddress: req.ip };
}

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    path: '/api/v1/auth',
  });
}

function readRefreshToken(req: Request): string | undefined {
  const fromCookie = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  const fromBody = (req.body as { refreshToken?: string } | undefined)?.refreshToken;
  return fromCookie ?? fromBody;
}

class AuthController {
  register = async (req: Request, res: Response): Promise<void> => {
    const result = await authService.register(req.body as RegisterInput, requestMeta(req));
    setRefreshCookie(res, result.tokens.refreshToken);
    sendCreated(res, { user: result.user, accessToken: result.tokens.accessToken });
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const result = await authService.login(req.body as LoginInput, requestMeta(req));
    setRefreshCookie(res, result.tokens.refreshToken);
    sendSuccess(res, { user: result.user, accessToken: result.tokens.accessToken });
  };

  refresh = async (req: Request, res: Response): Promise<void> => {
    const token = readRefreshToken(req);
    if (!token) {
      throw new UnauthorizedError('Missing refresh token');
    }
    const tokens = await authService.refresh(token, requestMeta(req));
    setRefreshCookie(res, tokens.refreshToken);
    sendSuccess(res, { accessToken: tokens.accessToken });
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    await authService.logout(readRefreshToken(req));
    res.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' });
    sendSuccess(res, { message: 'Logged out' });
  };

  me = async (req: Request, res: Response): Promise<void> => {
    const { userId } = getAuth(req);
    sendSuccess(res, await authService.me(userId));
  };

  createStaff = async (req: Request, res: Response): Promise<void> => {
    const shopId = getShopId(req);
    sendCreated(res, await authService.createStaff(shopId, req.body as CreateStaffInput));
  };
}

export const authController = new AuthController();
