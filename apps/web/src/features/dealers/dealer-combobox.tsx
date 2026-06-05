"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useDebounce } from "@/hooks/use-debounce";
import { useDealers } from "./hooks";
import type { Dealer } from "@/types/models";
import { cn } from "@/lib/utils";

interface Props {
  value: Dealer | null;
  onSelect: (dealer: Dealer | null) => void;
  disabled?: boolean;
  placeholder?: string;
}

/** Optional dealer picker backed by GET /dealers. Supports clearing the selection. */
export function DealerCombobox({ value, onSelect, disabled, placeholder = "Optional — select dealer" }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const search = useDebounce(query, 300);
  const { data, isLoading } = useDealers({ search: search || undefined, limit: 20 });
  const dealers = data?.data ?? [];

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
        <span className="truncate">{value ? value.name : placeholder}</span>
        {value ? (
          <X
            className="h-4 w-4 shrink-0 opacity-60 hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(null);
            }}
          />
        ) : (
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-60" />
        )}
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="relative border-b border-outline-variant p-2">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search dealers…"
            className="border-0 pl-8 focus:ring-0"
          />
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Spinner className="h-5 w-5" />
            </div>
          ) : dealers.length === 0 ? (
            <p className="px-3 py-6 text-center font-body-sm text-body-sm text-on-surface-variant">
              No dealers found.
            </p>
          ) : (
            dealers.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => {
                  onSelect(d);
                  setOpen(false);
                  setQuery("");
                }}
                className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left transition-colors hover:bg-surface-container-low"
              >
                <span className="min-w-0">
                  <span className="block truncate font-label-md text-label-md text-on-surface">{d.name}</span>
                  {d.contactName ? (
                    <span className="block truncate font-label-sm text-[11px] text-on-surface-variant">
                      {d.contactName}
                    </span>
                  ) : null}
                </span>
                {value?.id === d.id ? <Check className="h-4 w-4 shrink-0 text-primary" /> : null}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
