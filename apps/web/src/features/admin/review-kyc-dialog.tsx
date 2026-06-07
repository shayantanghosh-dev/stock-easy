"use client";

import { useState } from "react";
import { Check, Eye, EyeOff, FileText, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { StatusBadge } from "@/components/shared/status-badge";
import { toast } from "@/components/ui/toaster";
import { DOCUMENT_KIND_LABEL, formatBytes } from "@/lib/documents";
import { formatDate, formatDateTime } from "@/lib/format";
import { adminService } from "@/services/admin.service";
import type { ShopDocument } from "@/types/models";
import type { ShopWithOwner } from "./types";
import { useApproveShop, useShopDocuments } from "./hooks";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shop: ShopWithOwner | null;
  onReject: (shop: ShopWithOwner) => void;
}

function maskAadhaar(v: string | null): string {
  if (!v) return "—";
  const digits = v.replace(/\D/g, "");
  return digits.length >= 4 ? `XXXX XXXX ${digits.slice(-4)}` : "XXXX XXXX XXXX";
}
function maskPan(v: string | null): string {
  if (!v) return "—";
  return v.length > 4 ? `XXXXXX${v.slice(-4)}` : "XXXXXX";
}

export function ReviewKycDialog({ open, onOpenChange, shop, onReject }: Props) {
  const approve = useApproveShop();
  const { data: docs, isLoading } = useShopDocuments(open ? shop?.id : undefined);
  const [revealed, setRevealed] = useState(false);

  const close = (o: boolean) => {
    if (!o) setRevealed(false);
    onOpenChange(o);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Verification review{shop ? ` — ${shop.name}` : ""}</DialogTitle>
          <DialogDescription>
            Confirm the pharmacy&apos;s business details and KYC documents before approving.
          </DialogDescription>
        </DialogHeader>

        {shop ? (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <StatusBadge status={shop.status} />
              <span className="font-label-sm text-[11px] text-on-surface-variant">
                Registered {formatDate(shop.createdAt)}
              </span>
            </div>

            <section className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              <Field label="Owner" value={shop.owner?.fullName ?? "—"} sub={shop.owner?.email} />
              <Field label="Phone" value={shop.phone ?? "—"} />
              <Field
                label="Address"
                value={[shop.address, shop.city, shop.state, shop.postalCode].filter(Boolean).join(", ") || "—"}
                full
              />
              <Field label="Drug license no." value={shop.licenseNumber} mono />
              <Field label="GST number" value={shop.gstNumber ?? "—"} mono />
            </section>

            {/* Sensitive identifiers — masked by default, revealable by the admin. */}
            <section className="rounded-lg border border-outline-variant bg-surface-container-low/40 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-label-sm text-label-sm font-semibold uppercase tracking-wide text-on-surface-variant">
                  Sensitive KYC identifiers
                </span>
                <Button variant="ghost" size="sm" onClick={() => setRevealed((r) => !r)}>
                  {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {revealed ? "Hide" : "Reveal"}
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field
                  label="Aadhaar"
                  value={revealed ? shop.aadhaarNumber ?? "—" : maskAadhaar(shop.aadhaarNumber)}
                  mono
                />
                <Field label="PAN" value={revealed ? shop.panNumber ?? "—" : maskPan(shop.panNumber)} mono />
              </div>
            </section>

            <section className="space-y-2">
              <span className="font-label-sm text-label-sm font-semibold uppercase tracking-wide text-on-surface-variant">
                Uploaded documents
              </span>
              {isLoading ? (
                <div className="flex justify-center py-4">
                  <Spinner className="h-5 w-5" />
                </div>
              ) : (docs?.length ?? 0) === 0 ? (
                <p className="rounded-lg border border-outline-variant bg-surface-container-low/30 p-3 text-center font-body-sm text-body-sm text-on-surface-variant">
                  No documents uploaded.
                </p>
              ) : (
                <ul className="space-y-2">
                  {docs!.map((doc) => (
                    <AdminDocItem key={doc.id} shopId={shop.id} doc={doc} />
                  ))}
                </ul>
              )}
            </section>
          </div>
        ) : null}

        <DialogFooter>
          {shop?.status === "pending" ? (
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  onOpenChange(false);
                  onReject(shop);
                }}
              >
                <X className="h-4 w-4" />
                Reject
              </Button>
              <Button
                variant="success"
                loading={approve.isPending}
                onClick={() => approve.mutate(shop.id, { onSuccess: () => onOpenChange(false) })}
              >
                <Check className="h-4 w-4" />
                Approve
              </Button>
            </>
          ) : (
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  value,
  sub,
  mono,
  full,
}: {
  label: string;
  value: string;
  sub?: string | null;
  mono?: boolean;
  full?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <p className="font-label-sm text-[11px] uppercase tracking-wide text-on-surface-variant">{label}</p>
      <p className={mono ? "font-data-mono text-body-sm text-on-surface" : "font-body-sm text-on-surface"}>{value}</p>
      {sub ? <p className="font-label-sm text-[11px] text-on-surface-variant">{sub}</p> : null}
    </div>
  );
}

function AdminDocItem({ shopId, doc }: { shopId: string; doc: ShopDocument }) {
  const [opening, setOpening] = useState(false);
  const view = async () => {
    setOpening(true);
    try {
      const url = await adminService.downloadShopDocument(shopId, doc.id);
      const opened = window.open(url, "_blank", "noopener,noreferrer");
      if (!opened) toast.error("Allow pop-ups to view the document");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      toast.error("Couldn't open the document");
    } finally {
      setOpening(false);
    }
  };

  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-outline-variant bg-surface-container-lowest p-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-container-high text-primary">
          <FileText className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-label-md text-label-md text-on-surface">{DOCUMENT_KIND_LABEL[doc.kind]}</p>
          <p className="truncate font-label-sm text-[11px] text-on-surface-variant">
            {doc.originalName} · {formatBytes(doc.byteSize)} · {formatDateTime(doc.createdAt)}
          </p>
        </div>
      </div>
      <Button variant="secondary" size="sm" onClick={view} loading={opening}>
        {opening ? null : <Eye className="h-4 w-4" />}
        View
      </Button>
    </li>
  );
}
