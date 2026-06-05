"use client";

import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField } from "@/components/shared/form-field";
import type { SubscriptionPlan } from "@/types/models";
import type { CreatePlanPayload } from "./types";
import { useCreatePlan, useUpdatePlan } from "./hooks";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan?: SubscriptionPlan | null;
}

export function PlanFormDialog({ open, onOpenChange, plan }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        {open ? <PlanFormBody key={plan?.id ?? "new"} plan={plan} onDone={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function featuresToText(features: Record<string, unknown> | undefined): string {
  if (!features) return "";
  return Object.entries(features)
    .filter(([, v]) => v === true)
    .map(([k]) => k)
    .join("\n");
}

function PlanFormBody({ plan, onDone }: { plan?: SubscriptionPlan | null; onDone: () => void }) {
  const isEdit = Boolean(plan);
  const create = useCreatePlan();
  const update = useUpdatePlan(plan?.id ?? "");

  const [name, setName] = useState(plan?.name ?? "");
  const [price, setPrice] = useState(plan ? String(plan.price) : "0");
  const [interval, setInterval] = useState<"month" | "year">((plan?.billingInterval as "month" | "year") ?? "month");
  const [maxUsers, setMaxUsers] = useState(plan?.maxUsers != null ? String(plan.maxUsers) : "");
  const [maxMedicines, setMaxMedicines] = useState(plan?.maxMedicines != null ? String(plan.maxMedicines) : "");
  const [features, setFeatures] = useState(featuresToText(plan?.features as Record<string, unknown> | undefined));
  const [isActive, setIsActive] = useState(plan?.isActive ?? true);
  const [error, setError] = useState<string>();

  const submitting = create.isPending || update.isPending;

  const submit = () => {
    if (name.trim().length < 2) {
      setError("Plan name is too short");
      return;
    }
    const featureMap = Object.fromEntries(
      features
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => [l, true] as const),
    );
    const payload: CreatePlanPayload = {
      name: name.trim(),
      price: Number(price) || 0,
      billingInterval: interval,
      maxUsers: maxUsers.trim() ? Number(maxUsers) : null,
      maxMedicines: maxMedicines.trim() ? Number(maxMedicines) : null,
      features: featureMap,
      isActive,
    };
    const action = isEdit && plan ? update.mutateAsync(payload) : create.mutateAsync(payload);
    action.then(onDone).catch(() => {});
  };

  return (
    <div className="space-y-5">
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit plan" : "Create plan"}</DialogTitle>
        <DialogDescription>Plans appear in every pharmacy&apos;s subscription page.</DialogDescription>
      </DialogHeader>

      <FormField label="Plan name" htmlFor="planName" error={error} required>
        <Input id="planName" value={name} onChange={(e) => setName(e.target.value)} placeholder="Pro" />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Price" htmlFor="planPrice" required>
          <Input id="planPrice" type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
        </FormField>
        <FormField label="Billing interval">
          <Select value={interval} onValueChange={(v) => setInterval(v as "month" | "year")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Monthly</SelectItem>
              <SelectItem value="year">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Max users" htmlFor="maxUsers" hint="Blank = unlimited">
          <Input id="maxUsers" type="number" min={1} value={maxUsers} onChange={(e) => setMaxUsers(e.target.value)} placeholder="Unlimited" />
        </FormField>
        <FormField label="Max medicines" htmlFor="maxMedicines" hint="Blank = unlimited">
          <Input id="maxMedicines" type="number" min={1} value={maxMedicines} onChange={(e) => setMaxMedicines(e.target.value)} placeholder="Unlimited" />
        </FormField>
      </div>

      <FormField label="Features" htmlFor="features" hint="One feature per line.">
        <Textarea
          id="features"
          value={features}
          onChange={(e) => setFeatures(e.target.value)}
          placeholder={"Priority support\nAdvanced analytics\nAI assistant"}
          rows={3}
        />
      </FormField>

      <div className="flex items-center justify-between rounded-lg border border-outline-variant p-3">
        <div>
          <Label htmlFor="planActive">Active</Label>
          <p className="font-body-sm text-body-sm text-on-surface-variant">Inactive plans are hidden from pharmacies.</p>
        </div>
        <Switch id="planActive" checked={isActive} onCheckedChange={setIsActive} />
      </div>

      <DialogFooter>
        <Button variant="secondary" onClick={onDone} disabled={submitting}>
          Cancel
        </Button>
        <Button onClick={submit} loading={submitting}>
          {isEdit ? "Save plan" : "Create plan"}
        </Button>
      </DialogFooter>
    </div>
  );
}
