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
    address: z.string().max(300).optional().or(z.literal("")),
    phone: z.string().max(30).optional().or(z.literal("")),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;
