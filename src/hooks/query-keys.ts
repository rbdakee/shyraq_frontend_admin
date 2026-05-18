import type { ChildListFilters, OffsetPaginationParams } from '@/api/children';
import type { ListGroupsOptions } from '@/api/groups';

// Query keys are hashed structurally (by value) by TanStack Query, so plain
// tuples are sufficient — no need to memoize/identity-cache them.
export const qk = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  kindergarten: {
    me: ['kindergarten', 'me'] as const,
  },
  dashboard: {
    summary: ['dashboard', 'summary'] as const,
    attendanceToday: (groupId?: string) =>
      ['dashboard', 'attendance-today', groupId ?? 'all'] as const,
    paymentsOverview: (from: string, to: string) =>
      ['dashboard', 'payments-overview', from, to] as const,
  },
  children: {
    all: ['children'] as const,
    list: (filters: ChildListFilters = {}) => ['children', 'list', filters] as const,
    detail: (id: string) => ['children', 'detail', id] as const,
    statusHistory: (id: string, params: OffsetPaginationParams = {}) =>
      ['children', 'status-history', id, params] as const,
    guardians: (id: string) => ['children', 'guardians', id] as const,
    groupHistory: (id: string) => ['children', 'group-history', id] as const,
    timeline: (id: string) => ['children', 'timeline', id] as const,
  },
  groups: {
    all: ['groups'] as const,
    list: (opts: ListGroupsOptions = {}) => ['groups', 'list', opts] as const,
  },
} as const;
