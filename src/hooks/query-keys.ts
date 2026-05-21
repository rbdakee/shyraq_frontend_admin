import type { ChildListFilters, OffsetPaginationParams } from '@/api/children';
import type { EnrollmentListFilters } from '@/api/enrollments';
import type { GroupListFilters } from '@/api/groups';
import type { InvoiceListFilters } from '@/api/invoices';
import type { ParentRequestListFilters } from '@/api/parent-requests';
import type { PaymentListFilters } from '@/api/payments';
import type { StaffListFilters } from '@/api/staff';
import type { TariffAssignmentListFilters } from '@/api/tariff-assignments';
import type { TariffPlanListFilters } from '@/api/tariff-plans';

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
  invoices: {
    all: ['invoices'] as const,
    list: (filters: InvoiceListFilters = {}) => ['invoices', 'list', filters] as const,
    detail: (id: string) => ['invoices', 'detail', id] as const,
  },
  payments: {
    all: ['payments'] as const,
    list: (filters: PaymentListFilters = {}) => ['payments', 'list', filters] as const,
    detail: (id: string) => ['payments', 'detail', id] as const,
  },
  tariffPlans: {
    all: ['tariff-plans'] as const,
    list: (filters: TariffPlanListFilters = {}) => ['tariff-plans', 'list', filters] as const,
    detail: (id: string) => ['tariff-plans', 'detail', id] as const,
  },
  tariffAssignments: {
    all: ['tariff-assignments'] as const,
    list: (filters: TariffAssignmentListFilters = {}) =>
      ['tariff-assignments', 'list', filters] as const,
    detail: (id: string) => ['tariff-assignments', 'detail', id] as const,
  },
  parentRequests: {
    all: ['parent-requests'] as const,
    list: (filters: Omit<ParentRequestListFilters, 'cursor'> = {}) =>
      ['parent-requests', 'list', filters] as const,
    detail: (id: string) => ['parent-requests', 'detail', id] as const,
    messages: (id: string) => ['parent-requests', 'messages', id] as const,
  },
} as const;
