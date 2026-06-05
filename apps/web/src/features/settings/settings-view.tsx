"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, ShieldCheck, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { PageLoader } from "@/components/shared/page-loader";
import { ErrorState } from "@/components/shared/error-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ShopWithPlan } from "@/services/shops.service";
import { useCreateStaff, useMyShop, useSetLicense, useUpdateShop } from "./hooks";
import {
  licenseSchema,
  shopDetailsSchema,
  staffSchema,
  type LicenseValues,
  type ShopDetailsValues,
  type StaffValues,
} from "./validators";

export function SettingsView() {
  const { data: shop, isLoading, isError, error, refetch } = useMyShop();

  if (isLoading) return <PageLoader />;
  if (isError || !shop) return <ErrorState error={error} onRetry={() => refetch()} />;

  return (
    <div className="space-y-6">
      <PageHeader title="Shop Settings" description="Manage your pharmacy profile, verification and staff." />

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Verification</CardTitle>
            <CardDescription>Your pharmacy&apos;s approval status.</CardDescription>
          </div>
          <StatusBadge status={shop.status} />
        </CardHeader>
        <CardContent>
          {shop.status === "rejected" && shop.rejectionReason ? (
            <p className="rounded-lg border border-error-container bg-error-container/30 p-3 font-body-sm text-body-sm text-on-error-container">
              <span className="font-bold">Rejected:</span> {shop.rejectionReason} — update your license below to
              re-submit.
            </p>
          ) : shop.status === "pending" ? (
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Your pharmacy is awaiting verification. Selling is enabled once approved.
            </p>
          ) : (
            <p className="font-body-sm text-body-sm text-on-surface-variant">Your pharmacy is verified and active.</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <ShopDetailsForm shop={shop} />
        <LicenseForm shop={shop} />
      </div>

      <StaffForm />
    </div>
  );
}

function ShopDetailsForm({ shop }: { shop: ShopWithPlan }) {
  const update = useUpdateShop();
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ShopDetailsValues>({
    resolver: zodResolver(shopDetailsSchema),
    defaultValues: { name: shop.name, phone: shop.phone ?? "", address: shop.address ?? "" },
  });

  const onSubmit = handleSubmit((values) =>
    update.mutate({ name: values.name, phone: values.phone || undefined, address: values.address || undefined }),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          Shop details
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <FormField label="Pharmacy name" htmlFor="name" error={errors.name?.message} required>
            <Input id="name" aria-invalid={!!errors.name} {...register("name")} />
          </FormField>
          <FormField label="Phone" htmlFor="phone" error={errors.phone?.message}>
            <Input id="phone" {...register("phone")} />
          </FormField>
          <FormField label="Address" htmlFor="address" error={errors.address?.message}>
            <Input id="address" {...register("address")} />
          </FormField>
          <Button type="submit" loading={update.isPending} disabled={!isDirty}>
            Save details
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function LicenseForm({ shop }: { shop: ShopWithPlan }) {
  const setLicense = useSetLicense();
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<LicenseValues>({
    resolver: zodResolver(licenseSchema),
    defaultValues: { licenseNumber: shop.licenseNumber, licenseDocUrl: shop.licenseDocUrl ?? "" },
  });

  const onSubmit = handleSubmit((values) =>
    setLicense.mutate({ licenseNumber: values.licenseNumber, licenseDocUrl: values.licenseDocUrl || undefined }),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          License
        </CardTitle>
        <CardDescription>Updating the license re-opens verification if previously rejected.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <FormField label="License number" htmlFor="licenseNumber" error={errors.licenseNumber?.message} required>
            <Input id="licenseNumber" aria-invalid={!!errors.licenseNumber} {...register("licenseNumber")} />
          </FormField>
          <FormField label="License document URL" htmlFor="licenseDocUrl" error={errors.licenseDocUrl?.message} hint="Optional link to a scanned license.">
            <Input id="licenseDocUrl" placeholder="https://…" {...register("licenseDocUrl")} />
          </FormField>
          <Button type="submit" loading={setLicense.isPending} disabled={!isDirty}>
            Save license
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function StaffForm() {
  const createStaff = useCreateStaff();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StaffValues>({
    resolver: zodResolver(staffSchema),
    defaultValues: { fullName: "", email: "", password: "" },
  });

  const onSubmit = handleSubmit((values) =>
    createStaff.mutate(values, { onSuccess: () => reset({ fullName: "", email: "", password: "" }) }),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-primary" />
          Add staff
        </CardTitle>
        <CardDescription>Create a staff login for your pharmacy. Staff can sell and manage inventory.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-3">
          <FormField label="Full name" htmlFor="staffName" error={errors.fullName?.message} required>
            <Input id="staffName" aria-invalid={!!errors.fullName} {...register("fullName")} />
          </FormField>
          <FormField label="Email" htmlFor="staffEmail" error={errors.email?.message} required>
            <Input id="staffEmail" type="email" aria-invalid={!!errors.email} {...register("email")} />
          </FormField>
          <FormField label="Temp password" htmlFor="staffPassword" error={errors.password?.message} required>
            <Input id="staffPassword" type="text" aria-invalid={!!errors.password} {...register("password")} />
          </FormField>
          <div className="sm:col-span-3">
            <Button type="submit" loading={createStaff.isPending}>
              <UserPlus className="h-4 w-4" />
              Create staff account
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
