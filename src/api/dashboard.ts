import { z } from 'zod';
import { apiClient } from './client';

const DashboardSummarySchema = z.object({
  active_children: z.number(),
  enrollments_in_processing: z.number(),
  invoices_overdue_count: z.number(),
  invoices_overdue_amount: z.number(),
  mtd_revenue: z.number(),
  ytd_revenue: z.number(),
  active_staff: z.number(),
  active_groups: z.number(),
});

export type DashboardSummary = z.infer<typeof DashboardSummarySchema>;

const AttendanceTodaySchema = z.object({
  in_kindergarten: z.number(),
  checked_out: z.number(),
  absent: z.number(),
  on_vacation: z.number(),
  sick: z.number(),
});

export type AttendanceToday = z.infer<typeof AttendanceTodaySchema>;

const PaymentStatusSchema = z.object({
  count: z.number(),
  amount: z.number(),
});

const ProviderBreakdownSchema = z.object({
  provider: z.string(),
  count: z.number(),
  amount: z.number(),
});

const PaymentsOverviewSchema = z.object({
  paid: PaymentStatusSchema,
  pending: PaymentStatusSchema,
  overdue: PaymentStatusSchema,
  refunded: PaymentStatusSchema,
  providers: z.array(ProviderBreakdownSchema).optional(),
});

export type PaymentsOverview = z.infer<typeof PaymentsOverviewSchema>;

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const data: unknown = await apiClient.get('admin/dashboard/summary').json();
  return DashboardSummarySchema.parse(data);
}

export async function getAttendanceToday(groupId?: string): Promise<AttendanceToday> {
  const searchParams: Record<string, string> = {};
  if (groupId) {
    searchParams.group_id = groupId;
  }
  const data: unknown = await apiClient
    .get('admin/dashboard/attendance-today', { searchParams })
    .json();
  return AttendanceTodaySchema.parse(data);
}

export async function getPaymentsOverview(range: {
  from: string;
  to: string;
}): Promise<PaymentsOverview> {
  const data: unknown = await apiClient
    .get('admin/dashboard/payments-overview', {
      searchParams: { from: range.from, to: range.to },
    })
    .json();
  return PaymentsOverviewSchema.parse(data);
}
