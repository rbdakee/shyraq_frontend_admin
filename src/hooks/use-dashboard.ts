import { useQuery } from '@tanstack/react-query';
import { getDashboardSummary, getAttendanceToday, getPaymentsOverview } from '@/api/dashboard';
import { qk } from './query-keys';

export function useDashboardSummary() {
  return useQuery({
    queryKey: qk.dashboard.summary,
    queryFn: getDashboardSummary,
    staleTime: 60_000,
  });
}

export function useAttendanceToday(groupId?: string) {
  return useQuery({
    queryKey: qk.dashboard.attendanceToday(groupId),
    queryFn: () => getAttendanceToday(groupId),
    staleTime: 60_000,
  });
}

export function usePaymentsOverview(range: { from: string; to: string }) {
  return useQuery({
    queryKey: qk.dashboard.paymentsOverview(range.from, range.to),
    queryFn: () => getPaymentsOverview(range),
    enabled: !!range.from && !!range.to,
    staleTime: 60_000,
  });
}
