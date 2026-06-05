"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { refreshAccessToken, tokenStore } from "@/services/api";
import { authService } from "@/services/auth.service";
import type { LoginPayload, MeProfile, RegisterPayload, UserRole } from "@/types/auth";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export interface AuthContextValue {
  user: MeProfile | null;
  status: AuthStatus;
  isAuthenticated: boolean;
  hasRole: (...roles: UserRole[]) => boolean;
  login: (payload: LoginPayload) => Promise<MeProfile>;
  register: (payload: RegisterPayload) => Promise<MeProfile>;
  logout: () => Promise<void>;
  refetchProfile: () => Promise<MeProfile | null>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MeProfile | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const queryClient = useQueryClient();
  const bootstrapped = useRef(false);

  const loadProfile = useCallback(async (): Promise<MeProfile | null> => {
    const profile = await authService.me();
    setUser(profile);
    setStatus("authenticated");
    return profile;
  }, []);

  const clearSession = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    setStatus("unauthenticated");
    queryClient.clear();
  }, [queryClient]);

  // Restore the session on first mount via the httpOnly refresh cookie.
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    (async () => {
      try {
        await refreshAccessToken();
        await loadProfile();
      } catch {
        tokenStore.clear();
        setUser(null);
        setStatus("unauthenticated");
      }
    })();
  }, [loadProfile]);

  // Let the API layer force-logout the UI when a silent refresh ultimately fails.
  useEffect(() => {
    tokenStore.registerAuthFailureHandler(() => {
      setUser(null);
      setStatus("unauthenticated");
      queryClient.clear();
    });
    return () => tokenStore.registerAuthFailureHandler(null);
  }, [queryClient]);

  const login = useCallback(
    async (payload: LoginPayload) => {
      const result = await authService.login(payload);
      tokenStore.set(result.accessToken);
      const profile = await loadProfile();
      return profile ?? (result.user as unknown as MeProfile);
    },
    [loadProfile],
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const result = await authService.register(payload);
      tokenStore.set(result.accessToken);
      const profile = await loadProfile();
      return profile ?? (result.user as unknown as MeProfile);
    },
    [loadProfile],
  );

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Best-effort: clear locally even if the network call fails.
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const hasRole = useCallback(
    (...roles: UserRole[]) => (user ? roles.includes(user.role) : false),
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      isAuthenticated: status === "authenticated",
      hasRole,
      login,
      register,
      logout,
      refetchProfile: loadProfile,
    }),
    [user, status, hasRole, login, register, logout, loadProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
