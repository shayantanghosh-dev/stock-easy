import { z } from 'zod';
import { ALLOWED_DOC_MIME_TYPES } from '../../config/constants';
import { aadhaarField, gstField, panField, postalCodeField } from '../../utils/kyc';
import { DocumentKind } from '@prisma/client';

export const updateShopSchema = z
  .object({
    name: z.string().min(2).max(160).optional(),
    address: z.string().max(300).optional(),
    city: z.string().max(120).optional(),
    state: z.string().max(120).optional(),
    postalCode: postalCodeField.optional(),
    phone: z.string().max(30).optional(),
    // GSTIN printed on invoices. Empty string clears it; max 20 (15 + slack).
    gstNumber: gstField.optional(),
    // KYC identifiers — owner-editable, masked on read.
    aadhaarNumber: aadhaarField.optional(),
    panNumber: panField.optional(),
  })
  .refine((o) => Object.keys(o).length > 0, { message: 'Provide at least one field to update' });

/** Base64 file upload for a verification document. */
export const uploadDocumentSchema = z.object({
  kind: z.nativeEnum(DocumentKind),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.enum(ALLOWED_DOC_MIME_TYPES),
  // Base64 (no data: prefix). Real size/format is re-validated after decoding.
  data: z.string().min(1).max(12_000_000),
});

export const setLicenseSchema = z
  .object({
    licenseNumber: z.string().min(3).max(80).optional(),
    licenseDocUrl: z.string().url().optional(),
  })
  .refine((o) => o.licenseNumber !== undefined || o.licenseDocUrl !== undefined, {
    message: 'Provide licenseNumber and/or licenseDocUrl',
  });

export type UpdateShopInput = z.infer<typeof updateShopSchema>;
export type SetLicenseInput = z.infer<typeof setLicenseSchema>;
export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
