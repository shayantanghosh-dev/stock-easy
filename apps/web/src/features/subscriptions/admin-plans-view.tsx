"use client";

import { useState } from "react";
import { CreditCard, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatMoney } from "@/lib/money";
import { formatNumber } from "@/lib/format";
import type { SubscriptionPlan } from "@/types/models";
import { useAdminPlans, useDeletePlan } from "./hooks";
import { PlanFormDialog } from "./plan-form-dialog";

export function AdminPlansView() {
  const { data, isLoading, isError, error, refetch } = useAdminPlans();
  const deletePlan = useDeletePlan();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SubscriptionPlan | null>(null);
  const [deleting, setDeleting] = useState<SubscriptionPlan | null>(null);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const columns: Column<SubscriptionPlan>[] = [
    {
      id: "name",
      header: "Plan",
      cell: (p) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-container-high text-primary">
            <CreditCard className="h-4 w-4" />
          </div>
          <span className="font-label-md text-label-md text-on-surface">{p.name}</span>
        </div>
      ),
    },
    {
      id: "price",
      header: "Price",
      align: "right",
      cell: (p) => (
        <span className="font-data-mono text-on-surface">
          {formatMoney(p.price)}
          <span className="text-on-surface-variant">/{p.billingInterval}</span>
        </span>
      ),
    },
    {
      id: "limits",
      header: "Limits",
      cell: (p) => (
        <span className="text-on-surface-variant">
          {p.maxUsers == null ? "∞" : formatNumber(p.maxUsers)} users ·{" "}
          {p.maxMedicines == null ? "∞" : formatNumber(p.maxMedicines)} meds
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (p) =>
        p.isActive ? <Badge variant="success" dot>Active</Badge> : <Badge variant="neutral" dot>Inactive</Badge>,
    },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (p) => (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger className="rounded-md p-1.5 text-on-surface-variant hover:bg-surface-container">
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setEditing(p);
                  setFormOpen(true);
                }}
              >
                <Pencil className="h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem destructive onClick={() => setDeleting(p)}>
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
        title="Subscription Plans"
        description="Manage the plan catalogue offered to pharmacies."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Create plan
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={data}
        rowKey={(p) => p.id}
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={() => refetch()}
        emptyState={
          <EmptyState
            icon={CreditCard}
            title="No plans yet"
            description="Create your first subscription plan."
            action={
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Create plan
              </Button>
            }
          />
        }
      />

      <PlanFormDialog open={formOpen} onOpenChange={setFormOpen} plan={editing} />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete plan?"
        description={deleting ? `"${deleting.name}" will be removed from the catalogue.` : undefined}
        destructive
        confirmLabel="Delete"
        loading={deletePlan.isPending}
        onConfirm={() => {
          if (!deleting) return;
          deletePlan.mutate(deleting.id, { onSuccess: () => setDeleting(null) });
        }}
      />
    </div>
  );
}
