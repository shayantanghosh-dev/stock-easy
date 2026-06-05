"use client";

import { Check, Store, X } from "lucide-react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import type { ShopWithOwner } from "./types";

interface Props {
  data: ShopWithOwner[] | undefined;
  isLoading?: boolean;
  isError?: boolean;
  error?: unknown;
  onRetry?: () => void;
  onApprove: (shop: ShopWithOwner) => void;
  onReject: (shop: ShopWithOwner) => void;
  approvingId?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function AdminShopsTable({
  data,
  isLoading,
  isError,
  error,
  onRetry,
  onApprove,
  onReject,
  approvingId,
  emptyTitle = "No shops",
  emptyDescription = "Nothing to show here.",
}: Props) {
  const columns: Column<ShopWithOwner>[] = [
    {
      id: "shop",
      header: "Pharmacy",
      cell: (s) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-container-high text-primary">
            <Store className="h-4 w-4" />
          </div>
          <div>
            <p className="font-label-md text-label-md text-on-surface">{s.name}</p>
            <p className="font-data-mono text-[11px] text-on-surface-variant">{s.licenseNumber}</p>
          </div>
        </div>
      ),
    },
    {
      id: "owner",
      header: "Owner",
      cell: (s) => (
        <div>
          <p className="text-on-surface">{s.owner?.fullName ?? "—"}</p>
          {s.owner?.email ? <p className="text-[11px] text-on-surface-variant">{s.owner.email}</p> : null}
        </div>
      ),
    },
    { id: "status", header: "Status", cell: (s) => <StatusBadge status={s.status} /> },
    {
      id: "created",
      header: "Registered",
      cell: (s) => <span className="text-on-surface-variant">{formatDate(s.createdAt)}</span>,
    },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (s) =>
        s.status === "pending" ? (
          <div className="flex justify-end gap-2">
            <Button
              variant="success"
              size="sm"
              onClick={() => onApprove(s)}
              loading={approvingId === s.id}
            >
              <Check className="h-4 w-4" />
              Approve
            </Button>
            <Button variant="secondary" size="sm" onClick={() => onReject(s)}>
              <X className="h-4 w-4" />
              Reject
            </Button>
          </div>
        ) : s.status === "rejected" && s.rejectionReason ? (
          <span className="font-label-sm text-[11px] text-error" title={s.rejectionReason}>
            {s.rejectionReason.length > 40 ? `${s.rejectionReason.slice(0, 40)}…` : s.rejectionReason}
          </span>
        ) : null,
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      rowKey={(s) => s.id}
      isLoading={isLoading}
      isError={isError}
      error={error}
      onRetry={onRetry}
      emptyState={<EmptyState icon={Store} title={emptyTitle} description={emptyDescription} />}
    />
  );
}
