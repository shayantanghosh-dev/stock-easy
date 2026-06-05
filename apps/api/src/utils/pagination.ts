import { DEFAULT_LIMIT, DEFAULT_PAGE, MAX_LIMIT } from '../config/constants';

export interface PaginationInput {
  page?: number;
  limit?: number;
}

export interface Pagination {
  page: number;
  limit: number;
  skip: number;
  take: number;
}

export interface PageMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

/** Normalises raw page/limit into safe skip/take values. */
export function getPagination(input: PaginationInput): Pagination {
  const page = Math.max(1, Math.trunc(input.page ?? DEFAULT_PAGE));
  const limit = Math.min(MAX_LIMIT, Math.max(1, Math.trunc(input.limit ?? DEFAULT_LIMIT)));
  return { page, limit, skip: (page - 1) * limit, take: limit };
}

/** Builds the `meta` block returned alongside paginated lists. */
export function buildPageMeta(total: number, page: number, limit: number): PageMeta {
  return { total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) };
}
