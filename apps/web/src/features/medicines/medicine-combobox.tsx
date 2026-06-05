"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useDebounce } from "@/hooks/use-debounce";
import { useMedicines } from "./hooks";
import type { Medicine } from "@/types/models";
import { cn } from "@/lib/utils";

interface Props {
  value: Medicine | null;
  onSelect: (medicine: Medicine) => void;
  disabled?: boolean;
  placeholder?: string;
}

/** Searchable medicine picker backed by GET /medicines. Reused by batches + POS. */
export function MedicineCombobox({ value, onSelect, disabled, placeholder = "Select medicine" }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const search = useDebounce(query, 300);
  const { data, isLoading } = useMedicines({ search: search || undefined, limit: 20 });
  const medicines = data?.data ?? [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 font-body-sm text-body-sm",
          "focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          value ? "text-on-surface" : "text-on-surface-variant/70",
        )}
      >
        <span className="truncate">
          {value ? `${value.name}${value.strength ? ` · ${value.strength}` : ""}` : placeholder}
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-60" />
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="relative border-b border-outline-variant p-2">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search medicines…"
            className="border-0 pl-8 focus:ring-0"
          />
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Spinner className="h-5 w-5" />
            </div>
          ) : medicines.length === 0 ? (
            <p className="px-3 py-6 text-center font-body-sm text-body-sm text-on-surface-variant">
              No medicines found.
            </p>
          ) : (
            medicines.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  onSelect(m);
                  setOpen(false);
                  setQuery("");
                }}
                className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left transition-colors hover:bg-surface-container-low"
              >
                <span className="min-w-0">
                  <span className="block truncate font-label-md text-label-md text-on-surface">{m.name}</span>
                  <span className="block truncate font-label-sm text-[11px] text-on-surface-variant">
                    {[m.strength, m.form].filter(Boolean).join(" · ") || m.unit}
                  </span>
                </span>
                {value?.id === m.id ? <Check className="h-4 w-4 shrink-0 text-primary" /> : null}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
