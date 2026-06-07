"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Clock, LogOut, RefreshCw, ShieldAlert, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { useSetLicense } from "@/features/settings/hooks";
import { KycDocuments } from "@/features/settings/kyc-documents";
import { licenseSchema, type LicenseValues } from "@/features/settings/validators";

/**
 * Full-screen gate shown to shop members whose pharmacy is not yet approved.
 * It deliberately renders NONE of the operational app chrome — the only actions
 * are: re-check status, sign out, and (for a rejected owner) re-submit the
 * license to re-open verification.
 */
export function ApprovalPending() {
  const { user, logout, refetchProfile } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const shop = user?.shop ?? null;
  const rejected = shop?.status === "rejected";
  const isOwner = user?.role === "shop_owner";

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetchProfile();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-10">
      <div className="w-full max-w-lg space-y-5">
        <Card className="overflow-hidden">
          <div
            className={
              rejected
                ? "flex items-center gap-3 border-b border-error-container bg-error-container/30 px-6 py-5"
                : "flex items-center gap-3 border-b border-outline-variant bg-primary/5 px-6 py-5"
            }
          >
            <div
              className={
                rejected
                  ? "flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-error-container text-error"
                  : "flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"
              }
            >
              {rejected ? <ShieldAlert className="h-6 w-6" /> : <Clock className="h-6 w-6" />}
            </div>
            <div>
              <h1 className="font-display text-headline-md text-on-surface">
                {rejected ? "Verification unsuccessful" : "Your pharmacy is under review"}
              </h1>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                {shop?.name ?? "Your pharmacy"}
              </p>
            </div>
          </div>

          <CardContent className="space-y-4 pt-5">
            {rejected ? (
              <p className="rounded-lg border border-error-container bg-error-container/20 p-3 font-body-sm text-body-sm text-on-error-container">
                <span className="font-semibold">Reason:</span>{" "}
                {shop?.rejectionReason || "Your submitted details could not be verified."}
                {isOwner ? " Update your license below to re-submit for review." : ""}
              </p>
            ) : (
              <p className="font-body-md text-on-surface-variant">
                Thanks for registering. A Stock Easy administrator is reviewing your pharmacy&apos;s
                license and details. Once approved, you&apos;ll get full access to the dashboard, point
                of sale, inventory, analytics and the AI assistant.
              </p>
            )}

            <div className="rounded-lg border border-outline-variant bg-surface-container-low/40 p-3">
              <Row label="Pharmacy" value={shop?.name ?? "—"} />
              <Row label="License No" value={shop?.licenseNumber ?? "—"} mono />
              <Row label="Status" value={rejected ? "Rejected" : "Pending review"} />
            </div>

            <ul className="space-y-1.5 font-body-sm text-body-sm text-on-surface-variant">
              <li className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
                Selling, inventory and reports unlock automatically after approval.
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
                No action needed — we&apos;ll review your submission shortly.
              </li>
            </ul>
          </CardContent>
        </Card>

        {isOwner ? (
          <KycDocuments description="Upload your Aadhaar, PAN and drug-license documents (PDF, JPG or PNG, up to 5 MB) for our team to verify. You can add or replace these any time before approval." />
        ) : null}

        {rejected && isOwner ? <ResubmitLicense shop={shop} /> : null}

        <div className="flex items-center justify-between gap-3">
          <p className="truncate font-label-sm text-label-sm text-on-surface-variant">
            Signed in as <span className="text-on-surface">{user?.email}</span>
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={onRefresh} loading={refreshing}>
              <RefreshCw className="h-4 w-4" />
              Check status
            </Button>
            <Button variant="ghost" size="sm" onClick={() => void logout()}>
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="font-label-sm text-label-sm text-on-surface-variant">{label}</span>
      <span className={mono ? "font-data-mono text-body-sm text-on-surface" : "font-body-sm text-on-surface"}>
        {value}
      </span>
    </div>
  );
}

function ResubmitLicense({ shop }: { shop: NonNullable<ReturnType<typeof useAuth>["user"]>["shop"] }) {
  const setLicense = useSetLicense();
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<LicenseValues>({
    resolver: zodResolver(licenseSchema),
    defaultValues: { licenseNumber: shop?.licenseNumber ?? "", licenseDocUrl: shop?.licenseDocUrl ?? "" },
  });

  const onSubmit = handleSubmit((values) =>
    setLicense.mutate({ licenseNumber: values.licenseNumber, licenseDocUrl: values.licenseDocUrl || undefined }),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-body-lg">Re-submit license</CardTitle>
        <CardDescription>Saving updated license details re-opens verification.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <FormField label="License number" htmlFor="re-licenseNumber" error={errors.licenseNumber?.message} required>
            <Input id="re-licenseNumber" aria-invalid={!!errors.licenseNumber} {...register("licenseNumber")} />
          </FormField>
          <FormField
            label="License document URL"
            htmlFor="re-licenseDocUrl"
            error={errors.licenseDocUrl?.message}
            hint="Optional link to a scanned license."
          >
            <Input id="re-licenseDocUrl" placeholder="https://…" {...register("licenseDocUrl")} />
          </FormField>
          <Button type="submit" loading={setLicense.isPending} disabled={!isDirty}>
            Re-submit for review
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
