"use client";

import { useState } from "react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { History } from "lucide-react";
import { formatNumber, formatRelative } from "@/lib/format";
import type { AiQueryLog } from "@/types/models";
import { useAiLogs } from "./hooks";

export function AiLogs() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, refetch } = useAiLogs({ page, limit: 20 });

  const columns: Column<AiQueryLog>[] = [
    {
      id: "question",
      header: "Question",
      cell: (l) => <span className="line-clamp-2 max-w-md text-on-surface">{l.question}</span>,
    },
    { id: "status", header: "Status", cell: (l) => <StatusBadge status={l.status} /> },
    {
      id: "rows",
      header: "Rows",
      align: "right",
      cell: (l) => <span className="font-data-mono text-on-surface-variant">{l.rowCount ?? "—"}</span>,
    },
    {
      id: "latency",
      header: "Latency",
      align: "right",
      cell: (l) => (
        <span className="font-data-mono text-on-surface-variant">
          {l.latencyMs != null ? `${formatNumber(l.latencyMs)} ms` : "—"}
        </span>
      ),
    },
    { id: "by", header: "Asked by", cell: (l) => l.user?.fullName ?? "—" },
    {
      id: "when",
      header: "When",
      align: "right",
      cell: (l) => <span className="text-on-surface-variant">{formatRelative(l.createdAt)}</span>,
    },
  ];

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={data?.data}
        rowKey={(l) => l.id}
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={() => refetch()}
        emptyState={
          <EmptyState
            icon={History}
            title="No questions yet"
            description="Questions asked to the AI assistant are logged here for auditing."
          />
        }
      />
      <Pagination meta={data?.meta} onPageChange={setPage} />
    </div>
  );
}
