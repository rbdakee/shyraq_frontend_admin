import type { AttendanceEventListFilters, DailyStatusListFilters } from '@/api/attendance';
import type { CameraListFilters } from '@/api/cameras';
import type { NotificationListFilters } from '@/api/notifications';
import type { ChildListFilters, OffsetPaginationParams } from '@/api/children';
import type { ContentListFilters } from '@/api/content';
import type { CustomDiscountListFilters, ApplicationListFilters } from '@/api/custom-discounts';
import type { DiagnosticTemplateListFilters } from '@/api/diagnostic-templates';
import type { EnrollmentListFilters } from '@/api/enrollments';
import type { GroupListFilters } from '@/api/groups';
import type { InvoiceListFilters } from '@/api/invoices';
import type { LocationListFilters } from '@/api/locations';
import type { MealPlanListFilters } from '@/api/meal-plans';
import type { ParentRequestListFilters } from '@/api/parent-requests';
import type { PaymentListFilters } from '@/api/payments';
import type { RefundListFilters } from '@/api/refunds';
import type {
  ScheduleTemplateListFilters,
  WeekSnapshotListFilters,
  ActivityEventListFilters,
} from '@/api/schedule';
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
  refunds: {
    all: ['refunds'] as const,
    list: (filters: RefundListFilters = {}) => ['refunds', 'list', filters] as const,
    detail: (id: string) => ['refunds', 'detail', id] as const,
  },
  customDiscounts: {
    all: ['custom-discounts'] as const,
    list: (filters: CustomDiscountListFilters = {}) =>
      ['custom-discounts', 'list', filters] as const,
    detail: (id: string) => ['custom-discounts', 'detail', id] as const,
    applications: (id: string, filters: ApplicationListFilters = {}) =>
      ['custom-discounts', 'applications', id, filters] as const,
  },
  parentRequests: {
    all: ['parent-requests'] as const,
    list: (filters: Omit<ParentRequestListFilters, 'cursor'> = {}) =>
      ['parent-requests', 'list', filters] as const,
    detail: (id: string) => ['parent-requests', 'detail', id] as const,
    messages: (id: string) => ['parent-requests', 'messages', id] as const,
  },
  schedule: {
    all: ['schedule'] as const,
    templatesList: (filters: ScheduleTemplateListFilters = {}) =>
      ['schedule', 'templates', 'list', filters] as const,
    templateDetail: (id: string) => ['schedule', 'templates', 'detail', id] as const,
    templateSlots: (templateId: string) => ['schedule', 'templates', templateId, 'slots'] as const,
    weekSnapshots: (filters: WeekSnapshotListFilters = {}) =>
      ['schedule', 'week-snapshots', filters] as const,
    activityEvents: (filters: ActivityEventListFilters = {}) =>
      ['schedule', 'activity-events', 'list', filters] as const,
    activityEventDetail: (id: string) => ['schedule', 'activity-events', 'detail', id] as const,
  },
  mealPlans: {
    all: ['meal-plans'] as const,
    list: (filters: MealPlanListFilters = {}) => ['meal-plans', 'list', filters] as const,
    detail: (id: string) => ['meal-plans', 'detail', id] as const,
  },
  content: {
    all: ['content'] as const,
    list: (filters: ContentListFilters = {}) => ['content', 'list', filters] as const,
    detail: (id: string) => ['content', 'detail', id] as const,
  },
  attendance: {
    all: ['attendance'] as const,
    events: (filters: AttendanceEventListFilters = {}) =>
      ['attendance', 'events', 'list', filters] as const,
    eventDetail: (id: string) => ['attendance', 'events', 'detail', id] as const,
    dailyStatuses: (filters: DailyStatusListFilters = {}) =>
      ['attendance', 'daily-statuses', 'list', filters] as const,
  },
  diagnosticTemplates: {
    all: ['diagnostic-templates'] as const,
    list: (filters: Omit<DiagnosticTemplateListFilters, 'cursor'> = {}) =>
      ['diagnostic-templates', 'list', filters] as const,
    detail: (id: string) => ['diagnostic-templates', 'detail', id] as const,
  },
  locations: {
    all: ['locations'] as const,
    list: (filters: LocationListFilters = {}) => ['locations', 'list', filters] as const,
    detail: (id: string) => ['locations', 'detail', id] as const,
  },
  cameras: {
    all: ['cameras'] as const,
    list: (filters: CameraListFilters = {}) => ['cameras', 'list', filters] as const,
    detail: (id: string) => ['cameras', 'detail', id] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    list: (filters: Omit<NotificationListFilters, 'cursor'> = {}) =>
      ['notifications', 'list', filters] as const,
    preferences: ['notifications', 'preferences'] as const,
  },
  myQr: ['users', 'me', 'qr'] as const,
} as const;
