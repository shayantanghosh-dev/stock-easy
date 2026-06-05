"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/form-field";
import type { Medicine } from "@/types/models";
import { medicineFormSchema, toMedicinePayload, type MedicineFormValues } from "./validators";
import { useCreateMedicine, useUpdateMedicine } from "./hooks";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  medicine?: Medicine | null;
}

function defaultsFor(medicine?: Medicine | null): MedicineFormValues {
  return {
    name: medicine?.name ?? "",
    genericName: medicine?.genericName ?? "",
    manufacturer: medicine?.manufacturer ?? "",
    category: medicine?.category ?? "",
    form: medicine?.form ?? "",
    strength: medicine?.strength ?? "",
    unit: medicine?.unit ?? "unit",
    hsnCode: medicine?.hsnCode ?? "",
    reorderLevel: medicine?.reorderLevel ?? 0,
  };
}

export function MedicineFormDialog({ open, onOpenChange, medicine }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        {open ? (
          <MedicineFormBody
            key={medicine?.id ?? "new"}
            medicine={medicine}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function MedicineFormBody({ medicine, onDone }: { medicine?: Medicine | null; onDone: () => void }) {
  const isEdit = Boolean(medicine);
  const create = useCreateMedicine();
  const update = useUpdateMedicine(medicine?.id ?? "");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MedicineFormValues>({
    resolver: zodResolver(medicineFormSchema),
    defaultValues: defaultsFor(medicine),
  });

  const submitting = create.isPending || update.isPending;

  const onSubmit = handleSubmit(async (values) => {
    const payload = toMedicinePayload(values);
    if (isEdit && medicine) {
      await update.mutateAsync(payload).then(onDone).catch(() => {});
    } else {
      await create.mutateAsync(payload).then(onDone).catch(() => {});
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit medicine" : "Add medicine"}</DialogTitle>
        <DialogDescription>
          {isEdit ? "Update this medicine's catalog details." : "Add a new medicine type to your catalog."}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Name" htmlFor="name" error={errors.name?.message} required className="sm:col-span-2">
          <Input id="name" placeholder="Amoxicillin" aria-invalid={!!errors.name} {...register("name")} />
        </FormField>
        <FormField label="Generic name" htmlFor="genericName" error={errors.genericName?.message}>
          <Input id="genericName" placeholder="Amoxicillin trihydrate" {...register("genericName")} />
        </FormField>
        <FormField label="Manufacturer" htmlFor="manufacturer" error={errors.manufacturer?.message}>
          <Input id="manufacturer" placeholder="Cipla" {...register("manufacturer")} />
        </FormField>
        <FormField label="Strength" htmlFor="strength" error={errors.strength?.message}>
          <Input id="strength" placeholder="500mg" {...register("strength")} />
        </FormField>
        <FormField label="Form" htmlFor="form" error={errors.form?.message}>
          <Input id="form" placeholder="Tablet, Syrup…" {...register("form")} />
        </FormField>
        <FormField label="Category" htmlFor="category" error={errors.category?.message}>
          <Input id="category" placeholder="Antibiotic" {...register("category")} />
        </FormField>
        <FormField label="Unit" htmlFor="unit" error={errors.unit?.message} required>
          <Input id="unit" placeholder="unit, strip, bottle" aria-invalid={!!errors.unit} {...register("unit")} />
        </FormField>
        <FormField label="HSN code" htmlFor="hsnCode" error={errors.hsnCode?.message}>
          <Input id="hsnCode" placeholder="3004" {...register("hsnCode")} />
        </FormField>
        <FormField
          label="Reorder level"
          htmlFor="reorderLevel"
          error={errors.reorderLevel?.message}
          hint="Low-stock alerts trigger at or below this quantity."
        >
          <Input
            id="reorderLevel"
            type="number"
            min={0}
            aria-invalid={!!errors.reorderLevel}
            {...register("reorderLevel")}
          />
        </FormField>
      </div>

      <DialogFooter>
        <Button type="button" variant="secondary" onClick={onDone} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          {isEdit ? "Save changes" : "Add medicine"}
        </Button>
      </DialogFooter>
    </form>
  );
}
