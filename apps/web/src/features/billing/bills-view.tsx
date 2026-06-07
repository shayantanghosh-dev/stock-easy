"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Receipt, Search } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDebounce } from "@/hooks/use-debounce";
import { formatMoney } from "@/lib/money";
import { formatDateTime, pluralize } from "@/lib/format";
import type { BillWithItems } from "@/types/models";
import { useBills } from "./hooks";

export function BillsView() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const debouncedSearch = useDebounce(search.trim(), 300);

  const params = {
    page,
    limit: 20,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  };
  const { data, isLoading, isError, error, refetch } = useBills(params);

  const columns: Column<BillWithItems>[] = [
    {
      id: "bill",
      header: "Bill",
      cell: (b) => <span className="font-data-mono text-primary">#{b.billNumber}</span>,
    },
    {
      id: "customer",
      header: "Customer",
      cell: (b) => (
        <div>
          <p className="text-on-surface">{b.customerName || "Counter sale"}</p>
          {b.customerPhone ? (
            <p className="font-data-mono text-[11px] text-on-surface-variant">{b.customerPhone}</p>
          ) : null}
        </div>
      ),
    },
    {
      id: "items",
      header: "Items",
      cell: (b) => (
        <span className="text-on-surface-variant">
          {b.items.length} {pluralize(b.items.length, "line")}
        </span>
      ),
    },
    {
      id: "total",
      header: "Total",
      align: "right",
      cell: (b) => <span className="font-data-mono font-bold text-on-surface">{formatMoney(b.total)}</span>,
    },
    { id: "status", header: "Status", cell: (b) => <StatusBadge status={b.status} /> },
    {
      id: "date",
      header: "Date",
      align: "right",
      cell: (b) => <span className="text-on-surface-variant">{formatDateTime(b.createdAt)}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bills"
        description="Sales history with returns and voids."
        actions={
          <Button asChild>
            <Link href="/pos">
              <Plus className="h-4 w-4" />
              New sale
            </Link>
          </Button>
        }
      />

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[16rem] flex-1 space-y-1.5">
          <Label htmlFor="bill-search">Search</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
            <Input
              id="bill-search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Bill #, customer name or phone…"
              className="pl-10"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="from">From</Label>
          <Input
            id="from"
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
            className="w-40"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="to">To</Label>
          <Input
            id="to"
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
            className="w-40"
          />
        </div>
        {search || from || to ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setFrom("");
              setTo("");
              setPage(1);
            }}
          >
            Clear
          </Button>
        ) : null}
      </div>

      <DataTable
        columns={columns}
        data={data?.data}
        rowKey={(b) => b.id}
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={() => refetch()}
        onRowClick={(b) => router.push(`/bills/${b.id}`)}
        emptyState={
          debouncedSearch || from || to ? (
            <EmptyState
              icon={Search}
              title="No matching bills"
              description="Try a different bill number, customer name, phone, or date range."
            />
          ) : (
            <EmptyState
              icon={Receipt}
              title="No bills yet"
              description="Completed sales will appear here."
              action={
                <Button asChild>
                  <Link href="/pos">
                    <Plus className="h-4 w-4" />
                    New sale
                  </Link>
                </Button>
              }
            />
          )
        }
      />

      <Pagination meta={data?.meta} onPageChange={setPage} />
    </div>
  );
}
