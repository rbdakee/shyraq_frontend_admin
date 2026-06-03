import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listAttendanceEvents,
  getAttendanceEvent,
  patchAttendanceEvent,
  listDailyStatuses,
} from '@/api/attendance';
import type {
  AttendanceEventListFilters,
  DailyStatusListFilters,
  PatchAttendanceBody,
} from '@/api/attendance';
import { qk } from './query-keys';

export type {
  AttendanceEvent,
  DailyStatus,
  AttendanceEventType,
  AttendanceMethod,
  IntradayStatus,
  AttendanceEventListFilters,
  DailyStatusListFilters,
  PatchAttendanceBody,
} from '@/api/attendance';

export { EventTypeEnum, AttendanceMethodEnum, IntradayStatusEnum } from '@/api/attendance';

const ONE_MINUTE = 60 * 1000;

export function useAttendanceEvents(filters: AttendanceEventListFilters = {}) {
  return useQuery({
    queryKey: qk.attendance.events(filters),
    queryFn: () => listAttendanceEvents(filters),
    staleTime: ONE_MINUTE,
  });
}

export function useAttendanceEvent(eventId: string | undefined) {
  return useQuery({
    queryKey: qk.attendance.eventDetail(eventId ?? ''),
    queryFn: () => getAttendanceEvent(eventId!),
    enabled: !!eventId,
  });
}

export function usePatchAttendanceEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, body }: { eventId: string; body: PatchAttendanceBody }) =>
      patchAttendanceEvent(eventId, body),
    onSuccess: (_data, { eventId }) => {
      void queryClient.invalidateQueries({
        queryKey: qk.attendance.eventDetail(eventId),
      });
      void queryClient.invalidateQueries({ queryKey: qk.attendance.all });
    },
  });
}

export function useDailyStatuses(filters: DailyStatusListFilters = {}) {
  return useQuery({
    queryKey: qk.attendance.dailyStatuses(filters),
    queryFn: () => listDailyStatuses(filters),
    staleTime: ONE_MINUTE,
  });
}
