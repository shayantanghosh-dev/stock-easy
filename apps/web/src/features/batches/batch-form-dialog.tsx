"use client";

import { useState } from "react";
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
import { MedicineCombobox } from "@/features/medicines/medicine-combobox";
import { DealerCombobox } from "@/features/dealers/dealer-combobox";
import type { BatchWithRelations, Dealer, Medicine } from "@/types/models";
import { batchFormSchema, toDateInput, type BatchFormValues } from "./validators";
import { useCreateBatch, useUpdateBatch } from "./hooks";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batch?: BatchWithRelations | null;
  presetMedicine?: Medicine | null;
}

export function BatchFormDialog({ open, onOpenChange, batch, presetMedicine }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        {open ? (
          <BatchFormBody
            key={batch?.id ?? presetMedicine?.id ?? "new"}
            batch={batch}
            presetMedicine={presetMedicine}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function BatchFormBody({
  batch,
  presetMedicine,
  onDone,
}: {
  batch?: BatchWithRelations | null;
  presetMedicine?: Medicine | null;
  onDone: () => void;
}) {
  const isEdit = Boolean(batch);
  const create = useCreateBatch();
  const update = useUpdateBatch(batch?.id ?? "");

  // Medicine + dealer live as objects for the comboboxes.
  const [medicine, setMedicine] = useState<Medicine | null>(
    presetMedicine ?? (batch?.medicine ? ({ ...batch.medicine } as Medicine) : null),
  );
  const [dealer, setDealer] = useState<Dealer | null>(
    batch?.dealer ? ({ ...batch.dealer } as Dealer) : null,
  );
  const [medicineError, setMedicineError] = useState<string | undefined>();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BatchFormValues>({
    resolver: zodResolver(batchFormSchema),
    defaultValues: {
      batchNumber: batch?.batchNumber ?? "",
      expiryDate: toDateInput(batch?.expiryDate),
      quantityReceived: batch?.quantityReceived ?? 1,
      costPrice: batch ? Number(batch.costPrice) : 0,
      mrp: batch ? Number(batch.mrp) : 0,
    },
  });

  const submitting = create.isPending || update.isPending;

  const onSubmit = handleSubmit(async (values) => {
    if (isEdit && batch) {
      await update
        .mutateAsync({
          batchNumber: values.batchNumber.trim(),
          dealerId: dealer?.id ?? null,
          expiryDate: values.expiryDate,
          costPrice: values.costPrice,
          mrp: values.mrp,
        })
        .then(onDone)
        .catch(() => {});
      return;
    }
    if (!medicine) {
      setMedicineError("Select a medicine");
      return;
    }
    await create
      .mutateAsync({
        medicineId: medicine.id,
        dealerId: dealer?.id,
        batchNumber: values.batchNumber.trim(),
        expiryDate: values.expiryDate,
        quantityReceived: values.quantityReceived,
        costPrice: values.costPrice,
        mrp: values.mrp,
      })
      .then(onDone)
      .catch(() => {});
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit batch" : "Add stock (new batch)"}</DialogTitle>
        <DialogDescription>
          {isEdit
            ? "Quantity received can't be edited — stock changes flow through sales, returns and voids."
            : "Record a received batch. It enters stock immediately and joins the FEFO queue."}
        </DialogDescription>
      </DialogHeader>

      <FormField label="Medicine" error={medicineError} required>
        <MedicineCombobox
          value={medicine}
          onSelect={(m) => {
            setMedicine(m);
            setMedicineError(undefined);
          }}
          disabled={isEdit || Boolean(presetMedicine)}
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Batch number" htmlFor="batchNumber" error={errors.batchNumber?.message} required>
          <Input id="batchNumber" placeholder="BCH-442" aria-invalid={!!errors.batchNumber} {...register("batchNumber")} />
        </FormField>
        <FormField label="Expiry date" htmlFor="expiryDate" error={errors.expiryDate?.message} required>
          <Input id="expiryDate" type="date" aria-invalid={!!errors.expiryDate} {...register("expiryDate")} />
        </FormField>
        <FormField
          label="Quantity received"
          htmlFor="quantityReceived"
          error={errors.quantityReceived?.message}
          required
          hint={isEdit ? "Locked after creation." : undefined}
        >
          <Input
            id="quantityReceived"
            type="number"
            min={1}
            disabled={isEdit}
            aria-invalid={!!errors.quantityReceived}
            {...register("quantityReceived")}
          />
        </FormField>
        <FormField label="Dealer" className="sm:col-span-1">
          <DealerCombobox value={dealer} onSelect={setDealer} />
        </FormField>
        <FormField label="Cost price" htmlFor="costPrice" error={errors.costPrice?.message}>
          <Input id="costPrice" type="number" step="0.01" min={0} {...register("costPrice")} />
        </FormField>
        <FormField label="MRP (sell price)" htmlFor="mrp" error={errors.mrp?.message} hint="Used as the FEFO unit price.">
          <Input id="mrp" type="number" step="0.01" min={0} aria-invalid={!!errors.mrp} {...register("mrp")} />
        </FormField>
      </div>

      <DialogFooter>
        <Button type="button" variant="secondary" onClick={onDone} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" variant={isEdit ? "primary" : "success"} loading={submitting}>
          {isEdit ? "Save changes" : "Add stock"}
        </Button>
      </DialogFooter>
    </form>
  );
}
