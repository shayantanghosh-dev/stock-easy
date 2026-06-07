import { z } from 'zod';
import { aadhaarField, gstField, panField, postalCodeField } from '../../utils/kyc';

export const registerSchema = z.object({
  owner: z.object({
    fullName: z.string().min(2).max(120),
    email: z.string().email(),
    password: z.string().min(8).max(128),
  }),
  shop: z.object({
    name: z.string().min(2).max(160),
    licenseNumber: z.string().min(3).max(80),
    // Business / KYC details collected at registration. address/city/state/
    // postalCode and Aadhaar/PAN are required for verification; gstNumber is
    // optional (not every pharmacy is GST-registered).
    address: z.string().min(3).max(300),
    city: z.string().min(1).max(120),
    state: z.string().min(1).max(120),
    postalCode: postalCodeField,
    phone: z.string().max(30).optional(),
    gstNumber: gstField.optional(),
    aadhaarNumber: aadhaarField,
    panNumber: panField,
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
