"use client";

import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/format";

const MONEY_RE = /^-?\d+\.\d{2}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}/;

function humanizeKey(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .replace(/^./, (c) => c.toUpperCase());
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string") {
    if (MONEY_RE.test(value)) return formatMoney(value);
    if (DATE_RE.test(value)) return formatDate(value);
    return value;
  }
  if (typeof value === "number") return value.toLocaleString();
  return JSON.stringify(value);
}

/** Generic renderer for the assistant's report rows (shape varies by tool). */
export function AiDataPreview({ data }: { data: unknown }) {
  if (data === null || data === undefined) return null;

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return <p className="px-1 py-2 font-body-sm text-body-sm text-on-surface-variant">No matching records.</p>;
    }
    const rows = data.slice(0, 8) as Array<Record<string, unknown>>;
    const cols = Object.keys(rows[0] ?? {}).filter((c) => !c.toLowerCase().endsWith("id"));
    return (
      <div className="overflow-hidden rounded-lg border border-outline-variant">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-body-sm">
            <thead className="bg-surface-container-low">
              <tr>
                {cols.map((c) => (
                  <th key={c} className="px-3 py-2 font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant">
                    {humanizeKey(c)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {rows.map((row, i) => (
                <tr key={i}>
                  {cols.map((c) => (
                    <td key={c} className="px-3 py-2 font-data-mono text-[12px] text-on-surface">
                      {formatValue(row[c])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.length > rows.length ? (
          <p className="border-t border-outline-variant bg-surface-container-low/40 px-3 py-1.5 font-label-sm text-[11px] text-on-surface-variant">
            Showing {rows.length} of {data.length} rows.
          </p>
        ) : null}
      </div>
    );
  }

  if (typeof data === "object") {
    const entries = Object.entries(data as Record<string, unknown>);
    return (
      <dl className="grid grid-cols-2 gap-2 rounded-lg border border-outline-variant p-3 sm:grid-cols-3">
        {entries.map(([k, v]) => (
          <div key={k}>
            <dt className="font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant">{humanizeKey(k)}</dt>
            <dd className="font-data-mono text-body-sm text-on-surface">{formatValue(v)}</dd>
          </div>
        ))}
      </dl>
    );
  }

  return <p className="font-data-mono text-body-sm text-on-surface">{formatValue(data)}</p>;
}
