"use client";

import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useDebounce } from "@/hooks/use-debounce";
import { useMedicines } from "@/features/medicines/hooks";
import type { Medicine } from "@/types/models";

/** Type-ahead medicine search that adds items to the POS cart on click. */
export function PosSearch({ onAdd }: { onAdd: (medicine: Medicine) => void }) {
  const [query, setQuery] = useState("");
  const search = useDebounce(query, 300);
  const { data, isLoading } = useMedicines({ search: search || undefined, limit: 8 });
  const medicines = data?.data ?? [];

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search medicines to add…"
          className="pl-10"
        />
      </div>

      <div className="max-h-[40vh] space-y-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Spinner className="h-5 w-5" />
          </div>
        ) : query && medicines.length === 0 ? (
          <p className="py-6 text-center font-body-sm text-body-sm text-on-surface-variant">
            No medicines match “{query}”.
          </p>
        ) : (
          medicines.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onAdd(m)}
              className="flex w-full items-center justify-between gap-3 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-left transition-colors hover:border-primary hover:bg-surface-container-low"
            >
              <span className="min-w-0">
                <span className="block truncate font-label-md text-label-md text-on-surface">{m.name}</span>
                <span className="block truncate font-label-sm text-[11px] text-on-surface-variant">
                  {[m.strength, m.form].filter(Boolean).join(" · ") || m.unit}
                </span>
              </span>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-on-secondary">
                <Plus className="h-4 w-4" />
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
