import { z } from 'zod';

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  sortBy: z.string().trim().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}

/**
 * Minimal shape every paginated query schema must satisfy — deliberately
 * narrower than the full `PaginationQuery` (which also carries `sortBy`/
 * `sortOrder`) so feature-specific list schemas (menu, orders, etc.) that
 * only need `page`/`pageSize` can reuse these helpers without importing
 * fields they don't have.
 */
export interface PageableQuery {
  page: number;
  pageSize: number;
}

/** Converts a validated pagination query into Prisma's `skip`/`take`. */
export function toPrismaPagination(query: PageableQuery): { skip: number; take: number } {
  return {
    skip: (query.page - 1) * query.pageSize,
    take: query.pageSize,
  };
}

/** Builds the response `meta` block every paginated list endpoint returns. */
export function buildPaginationMeta(query: PageableQuery, totalItems: number): PaginationMeta {
  return {
    page: query.page,
    pageSize: query.pageSize,
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / query.pageSize)),
  };
}
