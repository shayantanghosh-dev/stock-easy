import { z } from "zod";

/** Mirrors the backend loginSchema. */
export const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

/** Mirrors the backend registerSchema (+ a UI-only password confirmation). */
export const registerSchema = z
  .object({
    fullName: z.string().min(2, "Name is too short").max(120),
    email: z.string().min(1, "Email is required").email("Enter a valid email"),
    password: z.string().min(8, "Use at least 8 characters").max(128),
    confirmPassword: z.string().min(1, "Confirm your password"),
    shopName: z.string().min(2, "Pharmacy name is too short").max(160),
    licenseNumber: z.string().min(3, "License number is too short").max(80),
    // Business / KYC details required for verification.
    address: z.string().min(3, "Address is required").max(300),
    city: z.string().min(1, "City is required").max(120),
    state: z.string().min(1, "State is required").max(120),
    postalCode: z.string().regex(/^\d{6}$/, "Postal code must be 6 digits"),
    phone: z.string().max(30).optional().or(z.literal("")),
    gstNumber: z.string().max(20, "GSTIN is too long").optional().or(z.literal("")),
    aadhaarNumber: z
      .string()
      .transform((v) => v.replace(/\s+/g, ""))
      .pipe(z.string().regex(/^\d{12}$/, "Aadhaar must be 12 digits")),
    panNumber: z.string().regex(/^[A-Za-z]{5}[0-9]{4}[A-Za-z]$/, "Invalid PAN (e.g. ABCDE1234F)"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;
