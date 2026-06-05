import { z } from "zod";

/** Editable batch fields (shared by create + edit; medicine/qty are create-only). */
export const batchFormSchema = z.object({
  batchNumber: z.string().min(1, "Batch number is required").max(80),
  expiryDate: z.string().min(1, "Expiry date is required"),
  quantityReceived: z.coerce
    .number()
    .int("Whole number only")
    .positive("Must be at least 1"),
  costPrice: z.coerce.number().nonnegative("Cannot be negative"),
  mrp: z.coerce.number().nonnegative("Cannot be negative"),
});

export type BatchFormValues = z.infer<typeof batchFormSchema>;

/** Convert an ISO date/datetime to the yyyy-MM-dd value a date input expects. */
export function toDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}
