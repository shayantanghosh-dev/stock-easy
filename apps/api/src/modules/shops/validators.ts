import { z } from 'zod';

export const updateShopSchema = z
  .object({
    name: z.string().min(2).max(160).optional(),
    address: z.string().max(300).optional(),
    phone: z.string().max(30).optional(),
  })
  .refine((o) => Object.keys(o).length > 0, { message: 'Provide at least one field to update' });

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
