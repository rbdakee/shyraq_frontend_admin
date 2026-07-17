import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listAttendanceEvents,
  getAttendanceEvent,
  patchAttendanceEvent,
  checkIn,
  checkOut,
  deleteAttendanceEvent,
  getAttendanceEventHistory,
  listDailyStatuses,
  setDailyStatus,
} from '@/api/attendance';
import type {
  AttendanceEventListFilters,
  DailyStatusListFilters,
  HistoryListFilters,
  PatchAttendanceBody,
  CheckInBody,
  CheckOutBody,
  SetDailyStatusBody,
} from '@/api/attendance';
import { scanQr } from '@/api/qr';
import { qk } from './query-keys';

export type {
  AttendanceEvent,
  DailyStatus,
  AuditLogEntry,
  AttendanceEventType,
  AttendanceMethod,
  IntradayStatus,
  AuditAction,
  AttendanceEventListFilters,
  DailyStatusListFilters,
  HistoryListFilters,
  PatchAttendanceBody,
  CheckInBody,
  CheckOutBody,
  SetDailyStatusBody,
} from '@/api/attendance';

export type { ScannedUser, LinkedChild, ScanQrResponse } from '@/api/qr';

export {
  EventTypeEnum,
  AttendanceMethodEnum,
  IntradayStatusEnum,
  AuditActionEnum,
} from '@/api/attendance';

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
    onSuccess: () => {
      // WHY: eventType flip recreates the row with a new id (HANDOFF §20.4) —
      // point-invalidation of the old id is useless; broad invalidation is the only safe path.
      void queryClient.invalidateQueries({ queryKey: qk.attendance.all });
    },
  });
}

export function useCheckIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CheckInBody) => checkIn(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.attendance.all });
    },
  });
}

export function useCheckOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CheckOutBody) => checkOut(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.attendance.all });
    },
  });
}

export function useDeleteAttendanceEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) => deleteAttendanceEvent(eventId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.attendance.all });
    },
  });
}

export function useAttendanceEventHistory(
  eventId: string | undefined,
  filters: HistoryListFilters = {},
) {
  return useQuery({
    queryKey: qk.attendance.eventHistory(eventId ?? '', filters),
    queryFn: () => getAttendanceEventHistory(eventId!, filters),
    enabled: !!eventId,
  });
}

export function useDailyStatuses(filters: DailyStatusListFilters = {}) {
  return useQuery({
    queryKey: qk.attendance.dailyStatuses(filters),
    queryFn: () => listDailyStatuses(filters),
    staleTime: ONE_MINUTE,
  });
}

export function useSetDailyStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SetDailyStatusBody) => setDailyStatus(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.attendance.all });
    },
  });
}

export function useScanQr() {
  return useMutation({
    mutationFn: (token: string) => scanQr(token),
  });
}
