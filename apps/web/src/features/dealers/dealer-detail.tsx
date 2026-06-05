"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building2, Calendar, Mail, MapPin, Pencil, Phone, Receipt, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/shared/page-loader";
import { ErrorState } from "@/components/shared/error-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { initials } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import { useDealer, useDeleteDealer } from "./hooks";
import { DealerFormDialog } from "./dealer-form-dialog";

function InfoRow({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string | null }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container-high text-on-surface-variant">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">{label}</p>
        <p className="font-body-md text-on-surface">{value || "—"}</p>
      </div>
    </div>
  );
}

export function DealerDetail({ id }: { id: string }) {
  const router = useRouter();
  const { data: dealer, isLoading, isError, error, refetch } = useDealer(id);
  const deleteDealer = useDeleteDealer();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (isLoading) return <PageLoader />;
  if (isError || !dealer) return <ErrorState error={error} onRetry={() => refetch()} />;

  return (
    <div className="space-y-6">
      <Link
        href="/dealers"
        className="inline-flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dealers
      </Link>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-container-high font-display text-headline-md font-bold text-primary">
            {initials(dealer.name)}
          </div>
          <div>
            <h1 className="font-display text-headline-lg text-on-surface">{dealer.name}</h1>
            {dealer.contactName ? (
              <p className="font-body-md text-on-surface-variant">Contact: {dealer.contactName}</p>
            ) : null}
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
          <Button variant="secondary" onClick={() => setDeleting(true)}>
            <Trash2 className="h-4 w-4 text-error" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
          <h2 className="mb-1 font-display text-body-lg font-bold text-on-surface">Contact</h2>
          <div className="divide-y divide-outline-variant">
            <InfoRow icon={Phone} label="Phone" value={dealer.phone} />
            <InfoRow icon={Mail} label="Email" value={dealer.email} />
            <InfoRow icon={MapPin} label="Address" value={dealer.address} />
          </div>
        </div>
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
          <h2 className="mb-1 font-display text-body-lg font-bold text-on-surface">Business</h2>
          <div className="divide-y divide-outline-variant">
            <InfoRow icon={Receipt} label="Tax ID / GSTIN" value={dealer.taxId} />
            <InfoRow icon={Building2} label="Dealer name" value={dealer.name} />
            <InfoRow icon={Calendar} label="Added on" value={formatDate(dealer.createdAt)} />
          </div>
        </div>
      </div>

      <DealerFormDialog open={editing} onOpenChange={setEditing} dealer={dealer} />
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title="Delete dealer?"
        description={`"${dealer.name}" will be removed.`}
        destructive
        confirmLabel="Delete"
        loading={deleteDealer.isPending}
        onConfirm={() => deleteDealer.mutate(dealer.id, { onSuccess: () => router.push("/dealers") })}
      />
    </div>
  );
}
