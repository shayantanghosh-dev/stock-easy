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
import type { Dealer } from "@/types/models";
import { dealerFormSchema, toDealerPayload, type DealerFormValues } from "./validators";
import { useCreateDealer, useUpdateDealer } from "./hooks";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dealer?: Dealer | null;
}

export function DealerFormDialog({ open, onOpenChange, dealer }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        {open ? (
          <DealerFormBody key={dealer?.id ?? "new"} dealer={dealer} onDone={() => onOpenChange(false)} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function DealerFormBody({ dealer, onDone }: { dealer?: Dealer | null; onDone: () => void }) {
  const isEdit = Boolean(dealer);
  const create = useCreateDealer();
  const update = useUpdateDealer(dealer?.id ?? "");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DealerFormValues>({
    resolver: zodResolver(dealerFormSchema),
    defaultValues: {
      name: dealer?.name ?? "",
      contactName: dealer?.contactName ?? "",
      phone: dealer?.phone ?? "",
      email: dealer?.email ?? "",
      address: dealer?.address ?? "",
      taxId: dealer?.taxId ?? "",
    },
  });

  const submitting = create.isPending || update.isPending;

  const onSubmit = handleSubmit(async (values) => {
    const payload = toDealerPayload(values);
    if (isEdit && dealer) {
      await update.mutateAsync(payload).then(onDone).catch(() => {});
    } else {
      await create.mutateAsync(payload).then(onDone).catch(() => {});
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit dealer" : "Add dealer"}</DialogTitle>
        <DialogDescription>Suppliers you purchase stock from.</DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Dealer name" htmlFor="name" error={errors.name?.message} required className="sm:col-span-2">
          <Input id="name" placeholder="MedSupply Distributors" aria-invalid={!!errors.name} {...register("name")} />
        </FormField>
        <FormField label="Contact person" htmlFor="contactName" error={errors.contactName?.message}>
          <Input id="contactName" placeholder="Rajesh Kumar" {...register("contactName")} />
        </FormField>
        <FormField label="Phone" htmlFor="phone" error={errors.phone?.message}>
          <Input id="phone" placeholder="+91 98765 43210" {...register("phone")} />
        </FormField>
        <FormField label="Email" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" placeholder="sales@medsupply.com" aria-invalid={!!errors.email} {...register("email")} />
        </FormField>
        <FormField label="Tax ID / GSTIN" htmlFor="taxId" error={errors.taxId?.message}>
          <Input id="taxId" placeholder="29ABCDE1234F1Z5" {...register("taxId")} />
        </FormField>
        <FormField label="Address" htmlFor="address" error={errors.address?.message} className="sm:col-span-2">
          <Input id="address" placeholder="Industrial Area, Bengaluru" {...register("address")} />
        </FormField>
      </div>

      <DialogFooter>
        <Button type="button" variant="secondary" onClick={onDone} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          {isEdit ? "Save changes" : "Add dealer"}
        </Button>
      </DialogFooter>
    </form>
  );
}
