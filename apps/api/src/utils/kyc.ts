import { z } from 'zod';
import type { AllowedDocMimeType } from '../config/constants';

// ===========================================================================
// KYC helpers — sensitive-PII masking, document magic-byte sniffing, and the
// reusable Zod field schemas shared by the auth (registration) and shops
// (settings) validators. Centralised so masking + validation stay consistent
// across every code path a shop is serialized through.
// ===========================================================================

// ---- Masking ---------------------------------------------------------------

/** Mask an Aadhaar number to its last 4 digits: "XXXX XXXX 1234". */
export function maskAadhaar(value: string | null | undefined): string | null {
  if (!value) return value ?? null;
  const digits = value.replace(/\D/g, '');
  if (digits.length < 4) return 'XXXX XXXX XXXX';
  return `XXXX XXXX ${digits.slice(-4)}`;
}

/** Mask a PAN to its last 4 characters: "XXXXXX234F". */
export function maskPan(value: string | null | undefined): string | null {
  if (!value) return value ?? null;
  const trimmed = value.trim();
  if (trimmed.length <= 4) return 'XXXXXX' + trimmed;
  return 'XXXXXX' + trimmed.slice(-4);
}

/** Fields masked on every owner/staff-facing shop response. */
export interface MaskableShop {
  aadhaarNumber: string | null;
  panNumber: string | null;
}

/**
 * Return a copy of a shop row with its sensitive KYC identifiers masked. Applied
 * to every owner/staff-facing response (`/shops/me`, the shop embedded in
 * `/auth/me`). The central-admin verification endpoints deliberately skip this
 * so reviewers can see the full values.
 */
export function maskShop<T extends MaskableShop>(shop: T): T {
  return {
    ...shop,
    aadhaarNumber: maskAadhaar(shop.aadhaarNumber),
    panNumber: maskPan(shop.panNumber),
  };
}

/**
 * Sanitise a filename for the Content-Disposition header: strip all C0/C1
 * control characters, quotes and backslashes (header-injection safe), and cap
 * the length. Shared by the owner + admin download paths.
 */
// eslint-disable-next-line no-control-regex
const UNSAFE_FILENAME_CHARS = /[\x00-\x1f\x7f"\\]/g;
export function safeFilename(name: string): string {
  return name.replace(UNSAFE_FILENAME_CHARS, '_').slice(0, 200) || 'document';
}

// ---- Document magic-byte sniffing -----------------------------------------

/**
 * Detect a file's true MIME type from its leading bytes. Defends against a
 * client that declares e.g. `application/pdf` but uploads something else — we
 * only ever store a file whose real content matches an allowed type.
 */
export function sniffMimeType(buffer: Buffer): AllowedDocMimeType | null {
  if (buffer.length >= 4 && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return 'application/pdf'; // %PDF
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  return null;
}

// ---- Reusable Zod field schemas -------------------------------------------

/** Aadhaar: exactly 12 digits (spaces stripped). */
export const aadhaarField = z
  .string()
  .trim()
  .transform((v) => v.replace(/\s+/g, ''))
  .pipe(z.string().regex(/^\d{12}$/, 'Aadhaar number must be 12 digits'));

/** PAN: 5 letters, 4 digits, 1 letter — normalised to uppercase. */
export const panField = z
  .string()
  .trim()
  .transform((v) => v.toUpperCase())
  .pipe(z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Invalid PAN (e.g. ABCDE1234F)'));

/** Indian postal code (PIN): 6 digits. */
export const postalCodeField = z.string().trim().regex(/^\d{6}$/, 'Postal code must be 6 digits');

/** GSTIN: optional, up to 20 chars (15 + slack), uppercased. */
export const gstField = z
  .string()
  .trim()
  .max(20)
  .transform((v) => v.toUpperCase());
