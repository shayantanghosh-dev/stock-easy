"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDownWideNarrow, Boxes, MoreHorizontal, Pencil, Plus, Trash2, X } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MedicineCombobox } from "@/features/medicines/medicine-combobox";
import { formatMonthYear, formatNumber } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import type { BatchWithRelations, Medicine } from "@/types/models";
import { useBatches, useDeleteBatch } from "./hooks";
import { BatchFormDialog } from "./batch-form-dialog";
import { batchStatus } from "./utils";

type Mode = "all" | "in_stock" | "expiring";

export function BatchesView() {
  const router = useRouter();
  const initialMode = (useSearchParams().get("filter") as Mode | null) ?? "all";
  const [mode, setMode] = useState<Mode>(["all", "in_stock", "expiring"].includes(initialMode) ? initialMode : "all");
  const [page, setPage] = useState(1);
  const [medicineFilter, setMedicineFilter] = useState<Medicine | null>(null);

  const params = useMemo(
    () => ({
      page,
      limit: 20,
      medicineId: medicineFilter?.id,
      inStock: mode === "in_stock" ? true : undefined,
      expiringInDays: mode === "expiring" ? 30 : undefined,
    }),
    [page, mode, medicineFilter],
  );

  const { data, isLoading, isError, error, refetch } = useBatches(params);
  const deleteBatch = useDeleteBatch();

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<BatchWithRelations | null>(null);
  const [deleting, setDeleting] = useState<BatchWithRelations | null>(null);

  // Mark the earliest-expiry sellable batch per medicine as the next FEFO pick.
  const fefoNext = useMemo(() => {
    const seen = new Set<string>();
    const next = new Set<string>();
    for (const b of data?.data ?? []) {
      if (b.quantityRemaining > 0 && batchStatus(b) !== "expired" && !seen.has(b.medicineId)) {
        seen.add(b.medicineId);
        next.add(b.id);
      }
    }
    return next;
  }, [data]);

  const onModeChange = (m: string) => {
    setMode(m as Mode);
    setPage(1);
  };

  const columns: Column<BatchWithRelations>[] = [
    {
      id: "medicine",
      header: "Medicine",
      cell: (b) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded bg-surface-container-high text-primary">
            <Boxes className="h-4 w-4" />
          </div>
          <div>
            <p className="font-label-md text-label-md text-on-surface">{b.medicine?.name ?? "—"}</p>
            <p className="font-data-mono text-[11px] text-on-surface-variant">#{b.batchNumber}</p>
          </div>
        </div>
      ),
    },
    {
      id: "expiry",
      header: "Expiry",
      cell: (b) => (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-on-surface">{formatMonthYear(b.expiryDate)}</span>
          <StatusBadge status={batchStatus(b)} dot />
          {fefoNext.has(b.id) ? (
            <Badge variant="primary">
              <ArrowDownWideNarrow className="h-3 w-3" />
              Next FEFO
            </Badge>
          ) : null}
        </div>
      ),
    },
    {
      id: "stock",
      header: "Stock",
      align: "right",
      cell: (b) => (
        <span className="font-data-mono">
          <span className="text-on-surface">{formatNumber(b.quantityRemaining)}</span>
          <span className="text-on-surface-variant"> / {formatNumber(b.quantityReceived)}</span>
        </span>
      ),
    },
    {
      id: "mrp",
      header: "MRP",
      align: "right",
      cell: (b) => <span className="font-data-mono text-on-surface">{formatMoney(b.mrp)}</span>,
    },
    { id: "dealer", header: "Dealer", cell: (b) => b.dealer?.name ?? "—" },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (b) => (
        <div onClick={(e) => e.stopPropagation()} className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger className="rounded-md p-1.5 text-on-surface-variant hover:bg-surface-container">
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/medicines/${b.medicineId}`)}>
                View medicine
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setEditing(b)}>
                <Pencil className="h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem destructive onClick={() => setDeleting(b)}>
                <Trash2 className="h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Batches"
        description="Physical stock with expiry — sold in FEFO (first-expiry-first-out) order."
        actions={
          <Button variant="success" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Add stock
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={mode} onValueChange={onModeChange}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="in_stock">In stock</TabsTrigger>
            <TabsTrigger value="expiring">Expiring soon</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <div className="w-64">
            <MedicineCombobox
              value={medicineFilter}
              onSelect={(m) => {
                setMedicineFilter(m);
                setPage(1);
              }}
              placeholder="Filter by medicine"
            />
          </div>
          {medicineFilter ? (
            <Button variant="ghost" size="icon" onClick={() => setMedicineFilter(null)} aria-label="Clear filter">
              <X className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data?.data}
        rowKey={(b) => b.id}
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={() => refetch()}
        emptyState={
          <EmptyState
            icon={Boxes}
            title="No batches found"
            description={
              mode === "expiring"
                ? "Nothing is expiring within 30 days. FEFO is healthy."
                : "Add stock to create your first batch."
            }
            action={
              <Button variant="success" onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4" />
                Add stock
              </Button>
            }
          />
        }
      />

      <Pagination meta={data?.meta} onPageChange={setPage} />

      <BatchFormDialog open={addOpen} onOpenChange={setAddOpen} />
      <BatchFormDialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)} batch={editing} />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete batch?"
        description={deleting ? `Batch #${deleting.batchNumber} will be permanently removed.` : undefined}
        destructive
        confirmLabel="Delete"
        loading={deleteBatch.isPending}
        onConfirm={() => {
          if (!deleting) return;
          deleteBatch.mutate(deleting.id, { onSuccess: () => setDeleting(null) });
        }}
      />
    </div>
  );
}
