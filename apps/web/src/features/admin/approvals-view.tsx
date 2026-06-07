"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/shared/pagination";
import { useAdminShops, useApproveShop } from "./hooks";
import { AdminShopsTable } from "./admin-shops-table";
import { RejectShopDialog } from "./reject-shop-dialog";
import { ReviewKycDialog } from "./review-kyc-dialog";
import type { ShopWithOwner } from "./types";

export function ApprovalsView() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, refetch } = useAdminShops({ status: "pending", page, limit: 20 });
  const approve = useApproveShop();
  const [rejecting, setRejecting] = useState<ShopWithOwner | null>(null);
  const [reviewing, setReviewing] = useState<ShopWithOwner | null>(null);

  const pendingTotal = data?.meta.total ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pharmacy Approvals"
        description="Review and verify newly registered pharmacies."
        actions={
          pendingTotal > 0 ? (
            <Badge variant="warning" dot>
              {pendingTotal} pending
            </Badge>
          ) : undefined
        }
      />

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
        emptyTitle="All caught up"
        emptyDescription="There are no pharmacies awaiting verification."
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
