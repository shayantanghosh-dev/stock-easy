"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Ban, Printer, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/shared/page-loader";
import { ErrorState } from "@/components/shared/error-state";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/use-auth";
import { formatMoney } from "@/lib/money";
import { formatDateTime, formatMonthYear, humanizeEnum } from "@/lib/format";
import { useBill } from "./hooks";
import { ReturnDialog } from "./return-dialog";
import { VoidDialog } from "./void-dialog";

export function BillDetail({ id }: { id: string }) {
  const { data: bill, isLoading, isError, error, refetch } = useBill(id);
  const { hasRole } = useAuth();
  const [returnOpen, setReturnOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);

  if (isLoading) return <PageLoader />;
  if (isError || !bill) return <ErrorState error={error} onRetry={() => refetch()} />;

  const items = bill.items ?? [];
  const returnable = items.reduce((acc, i) => acc + (i.quantity - i.returnedQuantity), 0);
  const canReturn = bill.status !== "voided" && returnable > 0;
  const canVoid = bill.status === "completed" && hasRole("shop_owner");
  const returns = bill.returns ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <Link
          href="/bills"
          className="inline-flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to bills
        </Link>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Print
          </Button>
          {canReturn ? (
            <Button variant="secondary" size="sm" onClick={() => setReturnOpen(true)}>
              <Undo2 className="h-4 w-4" />
              Return items
            </Button>
          ) : null}
          {canVoid ? (
            <Button variant="destructive" size="sm" onClick={() => setVoidOpen(true)}>
              <Ban className="h-4 w-4" />
              Void
            </Button>
          ) : null}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-outline-variant p-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-headline-lg text-on-surface">
                Bill <span className="font-data-mono text-primary">#{bill.billNumber}</span>
              </h1>
              <StatusBadge status={bill.status} />
            </div>
            <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
              {formatDateTime(bill.createdAt)}
            </p>
          </div>
          <div className="text-right">
            <p className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Total</p>
            <p className="font-data-mono text-display-lg leading-none text-primary">{formatMoney(bill.total)}</p>
          </div>
        </div>

        {/* Meta */}
        <div className="grid gap-4 border-b border-outline-variant p-6 sm:grid-cols-3">
          <Meta label="Customer" value={bill.customerName || "Counter sale"} sub={bill.customerPhone} />
          <Meta label="Sold by" value={bill.soldBy?.fullName ?? "—"} />
          <Meta label="Payment" value={humanizeEnum(bill.paymentMethod)} />
        </div>

        {/* Items — each line shows the exact FEFO batch consumed */}
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Medicine</TableHead>
              <TableHead>Batch / Expiry</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Unit price</TableHead>
              <TableHead className="text-right">Line total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id} className="hover:bg-transparent">
                <TableCell>
                  <p className="font-label-md text-label-md text-on-surface">{item.medicine?.name ?? "Medicine"}</p>
                  {item.medicine?.strength ? (
                    <p className="font-label-sm text-[11px] text-on-surface-variant">{item.medicine.strength}</p>
                  ) : null}
                </TableCell>
                <TableCell>
                  <span className="font-data-mono text-primary">#{item.batch?.batchNumber ?? "—"}</span>
                  {item.batch?.expiryDate ? (
                    <span className="ml-2 text-on-surface-variant">Exp {formatMonthYear(item.batch.expiryDate)}</span>
                  ) : null}
                </TableCell>
                <TableCell className="text-right font-data-mono">
                  {item.quantity}
                  {item.returnedQuantity > 0 ? (
                    <span className="ml-1 text-warning">(−{item.returnedQuantity})</span>
                  ) : null}
                </TableCell>
                <TableCell className="text-right font-data-mono text-on-surface">{formatMoney(item.unitPrice)}</TableCell>
                <TableCell className="text-right font-data-mono font-bold text-on-surface">
                  {formatMoney(item.lineTotal)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Totals */}
        <div className="flex justify-end border-t border-outline-variant p-6">
          <dl className="w-full max-w-xs space-y-2 font-body-sm text-body-sm">
            <TotalRow label="Subtotal" value={formatMoney(bill.subtotal)} />
            <TotalRow label="Discount" value={`− ${formatMoney(bill.discount)}`} />
            <TotalRow label={`GST (${bill.gstRate}%)`} value={`+ ${formatMoney(bill.tax)}`} />
            <div className="flex items-center justify-between border-t border-outline-variant pt-2">
              <dt className="font-label-md text-label-md font-bold text-on-surface">Total</dt>
              <dd className="font-data-mono text-headline-md font-bold text-primary">{formatMoney(bill.total)}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Returns history */}
      {returns.length > 0 ? (
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
          <h2 className="mb-3 font-display text-body-lg font-bold text-on-surface">Returns</h2>
          <div className="space-y-3">
            {returns.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-lg border border-outline-variant bg-surface-container-low/40 p-3"
              >
                <div>
                  <p className="font-label-md text-label-md text-on-surface">
                    {r.items?.reduce((acc, it) => acc + it.quantity, 0) ?? 0} items returned
                  </p>
                  <p className="font-label-sm text-[11px] text-on-surface-variant">
                    {formatDateTime(r.createdAt)}
                    {r.reason ? ` · ${r.reason}` : ""}
                  </p>
                </div>
                <span className="font-data-mono font-bold text-secondary">
                  − {formatMoney(r.totalRefund)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {bill.status === "voided" && bill.voidReason ? (
        <div className="rounded-xl border border-error-container bg-error-container/30 p-4 font-body-sm text-on-error-container">
          <span className="font-bold">Voided:</span> {bill.voidReason}
        </div>
      ) : null}

      <ReturnDialog open={returnOpen} onOpenChange={setReturnOpen} bill={bill} />
      <VoidDialog open={voidOpen} onOpenChange={setVoidOpen} bill={bill} />
    </div>
  );
}

function Meta({ label, value, sub }: { label: string; value: string; sub?: string | null }) {
  return (
    <div>
      <p className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">{label}</p>
      <p className="font-body-md text-on-surface">{value}</p>
      {sub ? <p className="font-data-mono text-[11px] text-on-surface-variant">{sub}</p> : null}
    </div>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-on-surface-variant">{label}</dt>
      <dd className="font-data-mono text-on-surface">{value}</dd>
    </div>
  );
}
