"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART, CHART_SERIES, ChartTooltipCard } from "@/components/shared/chart-kit";
import { formatMoney } from "@/lib/money";
import { formatNumber } from "@/lib/format";
import type { TopMedicine } from "./types";

type Row = TopMedicine & { revenueNum: number };

function TopMedsTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: Row }> }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]!.payload;
  return (
    <ChartTooltipCard title={row.name}>
      <p>
        Revenue: <span className="font-data-mono text-on-surface">{formatMoney(row.revenue)}</span>
      </p>
      <p>
        Units: <span className="font-data-mono text-on-surface">{formatNumber(row.quantitySold)}</span>
      </p>
    </ChartTooltipCard>
  );
}

/**
 * Recharts body of the Analytics "Top medicines by revenue" card. Code-split
 * via next/dynamic (ssr:false) to keep Recharts out of the /analytics route's
 * initial JS.
 */
export default function AnalyticsTopChart({ rows }: { rows: Row[] }) {
  return (
    <div className="h-80 w-full">
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
            width={130}
            tick={{ fontSize: 12, fill: CHART.axis }}
            stroke={CHART.grid}
          />
          <Tooltip content={<TopMedsTooltip />} cursor={{ fill: "rgba(15,82,186,0.06)" }} />
          <Bar dataKey="revenueNum" radius={[0, 6, 6, 0]} barSize={22}>
            {rows.map((_, i) => (
              <Cell key={i} fill={CHART_SERIES[i % CHART_SERIES.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
