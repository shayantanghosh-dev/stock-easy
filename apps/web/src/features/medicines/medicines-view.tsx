"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MoreHorizontal, Pencil, Pill, Plus, Search, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useListParams } from "@/hooks/use-list-params";
import type { Medicine } from "@/types/models";
import { useDeleteMedicine, useMedicines } from "./hooks";
import { MedicineFormDialog } from "./medicine-form-dialog";

export function MedicinesView() {
  const router = useRouter();
  const urlSearch = useSearchParams().get("search") ?? "";
  const { setPage, search, setSearch, params } = useListParams({ search: urlSearch });
  const { data, isLoading, isError, error, refetch } = useMedicines(params);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Medicine | null>(null);
  const [deleting, setDeleting] = useState<Medicine | null>(null);
  const deleteMutation = useDeleteMedicine();

  // Keep the table in sync when the global topbar search deep-links here.
  useEffect(() => {
    if (urlSearch) setSearch(urlSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSearch]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (medicine: Medicine) => {
    setEditing(medicine);
    setFormOpen(true);
  };

  const columns: Column<Medicine>[] = [
    {
      id: "name",
      header: "Medicine",
      cell: (m) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded bg-surface-container-high text-primary">
            <Pill className="h-4 w-4" />
          </div>
          <div>
            <p className="font-label-md text-label-md text-on-surface">{m.name}</p>
            {m.genericName ? (
              <p className="font-label-sm text-[11px] text-on-surface-variant">{m.genericName}</p>
            ) : null}
          </div>
        </div>
      ),
    },
    {
      id: "strength",
      header: "Strength / Form",
      cell: (m) => (
        <span className="text-on-surface-variant">
          {[m.strength, m.form].filter(Boolean).join(" · ") || "—"}
        </span>
      ),
    },
    { id: "category", header: "Category", cell: (m) => m.category || "—" },
    {
      id: "hsn",
      header: "HSN",
      cell: (m) => <span className="font-data-mono text-on-surface-variant">{m.hsnCode || "—"}</span>,
    },
    {
      id: "reorder",
      header: "Reorder level",
      align: "right",
      cell: (m) => (
        <span className="font-data-mono text-on-surface">
          {m.reorderLevel} {m.unit}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (m) => (
        <div onClick={(e) => e.stopPropagation()} className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger className="rounded-md p-1.5 text-on-surface-variant hover:bg-surface-container">
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/medicines/${m.id}`)}>
                View details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openEdit(m)}>
                <Pencil className="h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem destructive onClick={() => setDeleting(m)}>
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
        title="Medicines"
        description="Your pharmacy's medicine catalog."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add medicine
          </Button>
        }
      />

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or generic…"
          className="pl-10"
        />
      </div>

      <DataTable
        columns={columns}
        data={data?.data}
        rowKey={(m) => m.id}
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={() => refetch()}
        onRowClick={(m) => router.push(`/medicines/${m.id}`)}
        emptyState={
          <EmptyState
            icon={Pill}
            title={search ? "No matching medicines" : "No medicines yet"}
            description={
              search
                ? "Try a different search term."
                : "Add your first medicine to start tracking stock."
            }
            action={
              !search ? (
                <Button onClick={openCreate}>
                  <Plus className="h-4 w-4" />
                  Add medicine
                </Button>
              ) : undefined
            }
          />
        }
      />

      <Pagination meta={data?.meta} onPageChange={setPage} />

      <MedicineFormDialog open={formOpen} onOpenChange={setFormOpen} medicine={editing} />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete medicine?"
        description={
          deleting
            ? `"${deleting.name}" and its catalog entry will be removed. Batches referencing it may be affected.`
            : undefined
        }
        destructive
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (!deleting) return;
          deleteMutation.mutate(deleting.id, { onSuccess: () => setDeleting(null) });
        }}
      />
    </div>
  );
}
