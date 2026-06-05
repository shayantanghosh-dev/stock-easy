import { z } from 'zod';

export const registerSchema = z.object({
  owner: z.object({
    fullName: z.string().min(2).max(120),
    email: z.string().email(),
    password: z.string().min(8).max(128),
  }),
  shop: z.object({
    name: z.string().min(2).max(160),
    licenseNumber: z.string().min(3).max(80),
    address: z.string().max(300).optional(),
    phone: z.string().max(30).optional(),
  }),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().optional(),
});

export const createStaffSchema = z.object({
  fullName: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateStaffInput = z.infer<typeof createStaffSchema>;
