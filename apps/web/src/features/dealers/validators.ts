import { z } from "zod";
import type { CreateDealerPayload } from "./types";

const optionalText = (max: number) => z.string().max(max).optional().or(z.literal(""));

/** Mirrors the backend createDealerSchema. */
export const dealerFormSchema = z.object({
  name: z.string().min(2, "Name is too short").max(160),
  contactName: optionalText(120),
  phone: optionalText(30),
  email: z.string().email("Enter a valid email").max(160).optional().or(z.literal("")),
  address: optionalText(300),
  taxId: optionalText(40),
});

export type DealerFormValues = z.infer<typeof dealerFormSchema>;

export function toDealerPayload(values: DealerFormValues): CreateDealerPayload {
  const clean = (v: string | undefined) => (v && v.trim() ? v.trim() : undefined);
  return {
    name: values.name.trim(),
    contactName: clean(values.contactName),
    phone: clean(values.phone),
    email: clean(values.email),
    address: clean(values.address),
    taxId: clean(values.taxId),
  };
}
