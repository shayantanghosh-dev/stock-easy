"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART, CHART_SERIES, ChartTooltipCard } from "@/components/shared/chart-kit";
import { formatMoney } from "@/lib/money";
import { formatNumber } from "@/lib/format";
import type { TopMedicine } from "@/features/analytics/types";

type Row = TopMedicine & { revenueNum: number };

function TopTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: Row }> }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]!.payload;
  return (
    <ChartTooltipCard title={row.name}>
      <p>
        Revenue: <span className="font-data-mono text-on-surface">{formatMoney(row.revenue)}</span>
      </p>
      <p>
        Units sold: <span className="font-data-mono text-on-surface">{formatNumber(row.quantitySold)}</span>
      </p>
    </ChartTooltipCard>
  );
}

/**
 * Recharts body of the dashboard "Top Medicines" card. Code-split via
 * next/dynamic (ssr:false) so Recharts stays out of the dashboard route's
 * initial JS and loads on demand behind the card skeleton.
 */
export default function TopMedicinesChartInner({ rows }: { rows: Row[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
          <XAxis
            type="number"
            tickFormatter={(v) => formatMoney(v, { symbol: false })}
            tick={{ fontSize: 11, fill: CHART.axis }}
            stroke={CHART.grid}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={120}
            tick={{ fontSize: 12, fill: CHART.axis }}
            stroke={CHART.grid}
          />
          <Tooltip content={<TopTooltip />} cursor={{ fill: "rgba(15,82,186,0.06)" }} />
          <Bar dataKey="revenueNum" radius={[0, 6, 6, 0]} barSize={20}>
            {rows.map((_, i) => (
              <Cell key={i} fill={CHART_SERIES[i % CHART_SERIES.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
