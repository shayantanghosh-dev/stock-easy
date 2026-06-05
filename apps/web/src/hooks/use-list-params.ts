"use client";

import { useMemo, useState } from "react";
import { useDebounce } from "./use-debounce";

interface ListParamsState {
  page: number;
  limit: number;
  search: string;
}

/**
 * Local list state (page + debounced search) shared by every paginated list
 * view. Resetting the search returns to page 1 automatically.
 */
export function useListParams(initial?: Partial<ListParamsState>) {
  const [page, setPage] = useState(initial?.page ?? 1);
  const [limit, setLimit] = useState(initial?.limit ?? 20);
  const [search, setSearchRaw] = useState(initial?.search ?? "");
  const debouncedSearch = useDebounce(search, 350);

  const setSearch = (value: string) => {
    setSearchRaw(value);
    setPage(1);
  };

  const params = useMemo(
    () => ({ page, limit, ...(debouncedSearch ? { search: debouncedSearch } : {}) }),
    [page, limit, debouncedSearch],
  );

  return { page, setPage, limit, setLimit, search, setSearch, debouncedSearch, params };
}
