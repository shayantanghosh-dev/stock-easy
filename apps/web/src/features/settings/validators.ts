import { z } from "zod";

export const shopDetailsSchema = z.object({
  name: z.string().min(2, "Name is too short").max(160),
  phone: z.string().max(30).optional().or(z.literal("")),
  address: z.string().max(300).optional().or(z.literal("")),
  city: z.string().max(120).optional().or(z.literal("")),
  state: z.string().max(120).optional().or(z.literal("")),
  postalCode: z
    .string()
    .regex(/^\d{6}$/, "Postal code must be 6 digits")
    .optional()
    .or(z.literal("")),
  gstNumber: z.string().max(20, "GSTIN is too long").optional().or(z.literal("")),
  // Write-only: leave blank to keep the current value; only a new value updates.
  aadhaarNumber: z
    .string()
    .transform((v) => v.replace(/\s+/g, ""))
    .pipe(z.string().regex(/^\d{12}$/, "Aadhaar must be 12 digits"))
    .optional()
    .or(z.literal("")),
  panNumber: z
    .string()
    .regex(/^[A-Za-z]{5}[0-9]{4}[A-Za-z]$/, "Invalid PAN (e.g. ABCDE1234F)")
    .optional()
    .or(z.literal("")),
});
export type ShopDetailsValues = z.infer<typeof shopDetailsSchema>;

export const licenseSchema = z.object({
  licenseNumber: z.string().min(3, "License number is too short").max(80),
  licenseDocUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
});
export type LicenseValues = z.infer<typeof licenseSchema>;

export const staffSchema = z.object({
  fullName: z.string().min(2, "Name is too short").max(120),
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters").max(128),
});
export type StaffValues = z.infer<typeof staffSchema>;
