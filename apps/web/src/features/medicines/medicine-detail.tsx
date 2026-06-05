"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Boxes, CalendarClock, Layers, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/shared/page-loader";
import { ErrorState } from "@/components/shared/error-state";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate, formatMonthYear, formatNumber } from "@/lib/format";
import { formatMoney, multiplyMoney, sumMoney } from "@/lib/money";
import type { BatchWithRelations } from "@/types/models";
import { useMedicine } from "./hooks";
import { MedicineFormDialog } from "./medicine-form-dialog";
import { useBatches, useDeleteBatch } from "@/features/batches/hooks";
import { BatchFormDialog } from "@/features/batches/batch-form-dialog";
import { batchStatus } from "@/features/batches/utils";

function SummaryTile({ icon: Icon, label, value, accent }: { icon: typeof Boxes; label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
      <div className="mb-2 flex items-center gap-2 text-on-surface-variant">
        <Icon className="h-4 w-4" />
        <span className="font-label-sm text-label-sm uppercase tracking-wider">{label}</span>
      </div>
      <p className={`font-data-mono text-headline-md ${accent ? "text-error" : "text-on-surface"}`}>{value}</p>
    </div>
  );
}

export function MedicineDetail({ id }: { id: string }) {
  const { data: medicine, isLoading, isError, error, refetch } = useMedicine(id);
  const batchesQuery = useBatches({ medicineId: id, limit: 100 });
  const batches = useMemo(() => batchesQuery.data?.data ?? [], [batchesQuery.data]);
  const deleteBatch = useDeleteBatch();

  const [editMedicine, setEditMedicine] = useState(false);
  const [addBatch, setAddBatch] = useState(false);
  const [editBatch, setEditBatch] = useState<BatchWithRelations | null>(null);
  const [deletingBatch, setDeletingBatch] = useState<BatchWithRelations | null>(null);

  const summary = useMemo(() => {
    const totalStock = batches.reduce((acc, b) => acc + b.quantityRemaining, 0);
    const stockValue = sumMoney(batches.map((b) => multiplyMoney(b.mrp, b.quantityRemaining)));
    const future = batches
      .filter((b) => b.quantityRemaining > 0)
      .map((b) => b.expiryDate)
      .sort();
    return { totalStock, stockValue, nearestExpiry: future[0] ?? null };
  }, [batches]);

  if (isLoading) return <PageLoader />;
  if (isError || !medicine) return <ErrorState error={error} onRetry={() => refetch()} />;

  const belowReorder = summary.totalStock <= medicine.reorderLevel;

  const columns: Column<BatchWithRelations>[] = [
    {
      id: "batch",
      header: "Batch",
      cell: (b) => <span className="font-data-mono text-primary">#{b.batchNumber}</span>,
    },
    {
      id: "expiry",
      header: "Expiry",
      cell: (b) => (
        <div className="flex items-center gap-2">
          <span className="text-on-surface">{formatMonthYear(b.expiryDate)}</span>
          <StatusBadge status={batchStatus(b)} dot />
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
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={() => setEditBatch(b)} aria-label="Edit batch">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setDeletingBatch(b)} aria-label="Delete batch">
            <Trash2 className="h-4 w-4 text-error" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Link
        href="/medicines"
        className="inline-flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to medicines
      </Link>

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-headline-lg text-on-surface">{medicine.name}</h1>
            {belowReorder ? <StatusBadge status="low_stock" label="Low stock" /> : null}
          </div>
          <p className="font-body-md text-on-surface-variant">
            {[medicine.strength, medicine.form, medicine.genericName].filter(Boolean).join(" · ") || "—"}
          </p>
          {medicine.manufacturer ? (
            <p className="font-label-sm text-label-sm text-on-surface-variant">By {medicine.manufacturer}</p>
          ) : null}
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setEditMedicine(true)}>
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
          <Button variant="success" onClick={() => setAddBatch(true)}>
            <Plus className="h-4 w-4" />
            Add stock
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryTile icon={Boxes} label="In stock" value={`${formatNumber(summary.totalStock)} ${medicine.unit}`} accent={belowReorder} />
        <SummaryTile icon={Layers} label="Batches" value={formatNumber(batches.length)} />
        <SummaryTile icon={Boxes} label="Stock value" value={formatMoney(summary.stockValue)} />
        <SummaryTile
          icon={CalendarClock}
          label="Nearest expiry"
          value={summary.nearestExpiry ? formatDate(summary.nearestExpiry) : "—"}
        />
      </div>

      <div className="space-y-2">
        <h2 className="font-display text-body-lg font-bold text-on-surface">Batches (FEFO order)</h2>
        <DataTable
          columns={columns}
          data={batches}
          rowKey={(b) => b.id}
          isLoading={batchesQuery.isLoading}
          isError={batchesQuery.isError}
          error={batchesQuery.error}
          onRetry={() => batchesQuery.refetch()}
          emptyState={
            <EmptyState
              icon={Boxes}
              title="No batches yet"
              description="Add a batch to bring this medicine into stock."
              action={
                <Button variant="success" onClick={() => setAddBatch(true)}>
                  <Plus className="h-4 w-4" />
                  Add stock
                </Button>
              }
            />
          }
        />
      </div>

      <MedicineFormDialog open={editMedicine} onOpenChange={setEditMedicine} medicine={medicine} />
      <BatchFormDialog open={addBatch} onOpenChange={setAddBatch} presetMedicine={medicine} />
      <BatchFormDialog open={Boolean(editBatch)} onOpenChange={(o) => !o && setEditBatch(null)} batch={editBatch} />

      <ConfirmDialog
        open={Boolean(deletingBatch)}
        onOpenChange={(o) => !o && setDeletingBatch(null)}
        title="Delete batch?"
        description={deletingBatch ? `Batch #${deletingBatch.batchNumber} will be permanently removed.` : undefined}
        destructive
        confirmLabel="Delete"
        loading={deleteBatch.isPending}
        onConfirm={() => {
          if (!deletingBatch) return;
          deleteBatch.mutate(deletingBatch.id, { onSuccess: () => setDeletingBatch(null) });
        }}
      />
    </div>
  );
}
