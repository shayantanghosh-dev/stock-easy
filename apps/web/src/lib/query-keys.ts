/**
 * Centralised query-key factory.
 *
 * Every TanStack Query hook derives its key from here so cache invalidation is
 * consistent and refactor-safe. Keys are hierarchical: invalidating
 * `medicines.all` clears every medicines list + detail at once.
 */
export const queryKeys = {
  auth: {
    me: ["auth", "me"] as const,
  },
  shop: {
    me: ["shop", "me"] as const,
  },
  medicines: {
    all: ["medicines"] as const,
    list: (params: unknown) => ["medicines", "list", params] as const,
    detail: (id: string) => ["medicines", "detail", id] as const,
  },
  dealers: {
    all: ["dealers"] as const,
    list: (params: unknown) => ["dealers", "list", params] as const,
    detail: (id: string) => ["dealers", "detail", id] as const,
  },
  batches: {
    all: ["batches"] as const,
    list: (params: unknown) => ["batches", "list", params] as const,
    detail: (id: string) => ["batches", "detail", id] as const,
    fefo: (params: unknown) => ["batches", "fefo", params] as const,
  },
  bills: {
    all: ["bills"] as const,
    list: (params: unknown) => ["bills", "list", params] as const,
    detail: (id: string) => ["bills", "detail", id] as const,
  },
  analytics: {
    all: ["analytics"] as const,
    dashboard: ["analytics", "dashboard"] as const,
    expiringSoon: (days: number) => ["analytics", "expiring-soon", days] as const,
    lowStock: ["analytics", "low-stock"] as const,
    sales: (params: unknown) => ["analytics", "sales", params] as const,
    topMedicines: (params: unknown) => ["analytics", "top-medicines", params] as const,
    deadStock: ["analytics", "dead-stock"] as const,
  },
  ai: {
    all: ["ai"] as const,
    logs: (params: unknown) => ["ai", "logs", params] as const,
  },
  subscriptions: {
    plans: ["subscriptions", "plans"] as const,
    me: ["subscriptions", "me"] as const,
    adminPlans: ["subscriptions", "admin", "plans"] as const,
  },
  admin: {
    all: ["admin"] as const,
    shops: (params: unknown) => ["admin", "shops", params] as const,
    analytics: ["admin", "analytics"] as const,
  },
} as const;
