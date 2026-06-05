import { http } from "@/services/api";
import type {
  CreateStaffPayload,
  LoginPayload,
  LoginResponse,
  MeProfile,
  RegisterPayload,
  SafeUser,
} from "@/types/auth";

/** Thin, typed wrapper over the /auth endpoints. */
export const authService = {
  login: (payload: LoginPayload) => http.post<LoginResponse>("/auth/login", payload),
  register: (payload: RegisterPayload) => http.post<LoginResponse>("/auth/register", payload),
  me: () => http.get<MeProfile>("/auth/me"),
  logout: () => http.post<{ message: string }>("/auth/logout"),
  createStaff: (payload: CreateStaffPayload) => http.post<SafeUser>("/auth/staff", payload),
};
