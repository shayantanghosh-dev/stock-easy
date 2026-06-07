"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pagination } from "@/components/shared/pagination";
import type { ShopStatus } from "@/types/models";
import { useAdminShops, useApproveShop } from "./hooks";
import { AdminShopsTable } from "./admin-shops-table";
import { RejectShopDialog } from "./reject-shop-dialog";
import { ReviewKycDialog } from "./review-kyc-dialog";
import type { ShopWithOwner } from "./types";

type Filter = "all" | ShopStatus;

export function TenantsView() {
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, refetch } = useAdminShops({
    status: filter === "all" ? undefined : filter,
    page,
    limit: 20,
  });
  const approve = useApproveShop();
  const [rejecting, setRejecting] = useState<ShopWithOwner | null>(null);
  const [reviewing, setReviewing] = useState<ShopWithOwner | null>(null);

  const onFilterChange = (value: string) => {
    setFilter(value as Filter);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Tenants" description="Every pharmacy on the platform." />

      <Tabs value={filter} onValueChange={onFilterChange}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>
      </Tabs>

      <AdminShopsTable
        data={data?.data}
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={() => refetch()}
        onApprove={(s) => approve.mutate(s.id)}
        onReject={(s) => setRejecting(s)}
        onReview={(s) => setReviewing(s)}
        approvingId={approve.isPending ? (approve.variables as string) : undefined}
        emptyTitle="No pharmacies"
        emptyDescription="No pharmacies match this filter."
      />

      <Pagination meta={data?.meta} onPageChange={setPage} />

      <RejectShopDialog open={Boolean(rejecting)} onOpenChange={(o) => !o && setRejecting(null)} shop={rejecting} />
      <ReviewKycDialog
        open={Boolean(reviewing)}
        onOpenChange={(o) => !o && setReviewing(null)}
        shop={reviewing}
        onReject={(s) => setRejecting(s)}
      />
    </div>
  );
}
