"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Mail, MoreHorizontal, Pencil, Phone, Plus, Search, Trash2 } from "lucide-react";
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
import { initials } from "@/lib/utils";
import type { Dealer } from "@/types/models";
import { useDealers, useDeleteDealer } from "./hooks";
import { DealerFormDialog } from "./dealer-form-dialog";

export function DealersView() {
  const router = useRouter();
  const { setPage, search, setSearch, params } = useListParams();
  const { data, isLoading, isError, error, refetch } = useDealers(params);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Dealer | null>(null);
  const [deleting, setDeleting] = useState<Dealer | null>(null);
  const deleteMutation = useDeleteDealer();

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const columns: Column<Dealer>[] = [
    {
      id: "name",
      header: "Dealer",
      cell: (d) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container-high font-label-sm text-label-sm font-semibold text-primary">
            {initials(d.name)}
          </div>
          <div>
            <p className="font-label-md text-label-md text-on-surface">{d.name}</p>
            {d.contactName ? (
              <p className="font-label-sm text-[11px] text-on-surface-variant">{d.contactName}</p>
            ) : null}
          </div>
        </div>
      ),
    },
    {
      id: "phone",
      header: "Phone",
      cell: (d) =>
        d.phone ? (
          <span className="flex items-center gap-1.5 font-data-mono text-on-surface-variant">
            <Phone className="h-3.5 w-3.5" />
            {d.phone}
          </span>
        ) : (
          "—"
        ),
    },
    {
      id: "email",
      header: "Email",
      cell: (d) =>
        d.email ? (
          <span className="flex items-center gap-1.5 text-on-surface-variant">
            <Mail className="h-3.5 w-3.5" />
            {d.email}
          </span>
        ) : (
          "—"
        ),
    },
    {
      id: "taxId",
      header: "Tax ID",
      cell: (d) => <span className="font-data-mono text-on-surface-variant">{d.taxId || "—"}</span>,
    },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (d) => (
        <div onClick={(e) => e.stopPropagation()} className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger className="rounded-md p-1.5 text-on-surface-variant hover:bg-surface-container">
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/dealers/${d.id}`)}>View details</DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setEditing(d);
                  setFormOpen(true);
                }}
              >
                <Pencil className="h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem destructive onClick={() => setDeleting(d)}>
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
        title="Dealers"
        description="Suppliers your pharmacy purchases stock from."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add dealer
          </Button>
        }
      />

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search dealers…"
          className="pl-10"
        />
      </div>

      <DataTable
        columns={columns}
        data={data?.data}
        rowKey={(d) => d.id}
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={() => refetch()}
        onRowClick={(d) => router.push(`/dealers/${d.id}`)}
        emptyState={
          <EmptyState
            icon={Building2}
            title={search ? "No matching dealers" : "No dealers yet"}
            description={search ? "Try a different search term." : "Add your first supplier to get started."}
            action={
              !search ? (
                <Button onClick={openCreate}>
                  <Plus className="h-4 w-4" />
                  Add dealer
                </Button>
              ) : undefined
            }
          />
        }
      />

      <Pagination meta={data?.meta} onPageChange={setPage} />

      <DealerFormDialog open={formOpen} onOpenChange={setFormOpen} dealer={editing} />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete dealer?"
        description={deleting ? `"${deleting.name}" will be removed. Batches keep their record but lose this supplier link.` : undefined}
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
