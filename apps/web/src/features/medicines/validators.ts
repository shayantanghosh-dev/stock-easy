import { z } from "zod";
import type { CreateMedicinePayload } from "./types";

const optionalText = (max: number) => z.string().max(max).optional().or(z.literal(""));

/** Mirrors the backend createMedicineSchema. */
export const medicineFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  genericName: optionalText(200),
  manufacturer: optionalText(200),
  category: optionalText(120),
  form: optionalText(60),
  strength: optionalText(60),
  unit: z.string().min(1, "Unit is required").max(40),
  hsnCode: optionalText(20),
  reorderLevel: z.coerce.number().int("Whole number only").min(0, "Cannot be negative").max(1_000_000),
});

export type MedicineFormValues = z.infer<typeof medicineFormSchema>;

/** Strip empty optional strings so we don't send "" for unset fields. */
export function toMedicinePayload(values: MedicineFormValues): CreateMedicinePayload {
  const clean = (v: string | undefined) => (v && v.trim() ? v.trim() : undefined);
  return {
    name: values.name.trim(),
    genericName: clean(values.genericName),
    manufacturer: clean(values.manufacturer),
    category: clean(values.category),
    form: clean(values.form),
    strength: clean(values.strength),
    unit: values.unit.trim() || "unit",
    hsnCode: clean(values.hsnCode),
    reorderLevel: values.reorderLevel,
  };
}
