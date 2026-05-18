import type { ChildListFilters, OffsetPaginationParams } from '@/api/children';
import type { EnrollmentListFilters } from '@/api/enrollments';
import type { GroupListFilters } from '@/api/groups';
import type { StaffListFilters } from '@/api/staff';

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
  enrollments: {
    all: ['enrollments'] as const,
    list: (filters: EnrollmentListFilters = {}) => ['enrollments', 'list', filters] as const,
    detail: (id: string) => ['enrollments', 'detail', id] as const,
  },
  groups: {
    all: ['groups'] as const,
    list: (opts: GroupListFilters = {}) => ['groups', 'list', opts] as const,
    detail: (id: string) => ['groups', 'detail', id] as const,
    children: (id: string) => ['groups', 'children', id] as const,
    mentorHistory: (id: string) => ['groups', 'mentor-history', id] as const,
  },
  staff: {
    all: ['staff'] as const,
    list: (filters: StaffListFilters = {}) => ['staff', 'list', filters] as const,
    detail: (id: string) => ['staff', 'detail', id] as const,
  },
} as const;
