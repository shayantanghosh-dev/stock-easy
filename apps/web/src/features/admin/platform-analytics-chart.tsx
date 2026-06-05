"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ChartTooltipCard } from "@/components/shared/chart-kit";
import { formatNumber } from "@/lib/format";

const STATUS_COLORS = { Approved: "#006c49", Pending: "#9a6700", Rejected: "#ba1a1a" };

/**
 * Recharts body of the admin "Pharmacies by status" donut. Code-split via
 * next/dynamic (ssr:false) to keep Recharts out of the /admin/analytics route's
 * initial JS.
 */
export default function PlatformStatusChart({ data }: { data: Array<{ name: string; value: number }> }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={STATUS_COLORS[entry.name as keyof typeof STATUS_COLORS]} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) =>
              active && payload?.length ? (
                <ChartTooltipCard title={String(payload[0]!.name)}>
                  <p className="font-data-mono text-on-surface">{formatNumber(Number(payload[0]!.value))} shops</p>
                </ChartTooltipCard>
              ) : null
            }
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
