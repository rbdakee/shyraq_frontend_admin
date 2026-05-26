import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listScheduleTemplates,
  getScheduleTemplate,
  createScheduleTemplate,
  updateScheduleTemplate,
  listTemplateSlots,
  createSlot,
  updateSlot,
  deleteSlot,
  listWeekSnapshots,
  copyWeek,
  listActivityEvents,
  getActivityEvent,
  createActivityEvent,
  updateActivityEvent,
  deleteActivityEvent,
} from '@/api/schedule';
import type {
  ScheduleTemplateListFilters,
  WeekSnapshotListFilters,
  ActivityEventListFilters,
  CreateScheduleTemplateBody,
  UpdateScheduleTemplateBody,
  CreateSlotBody,
  UpdateSlotBody,
  CreateActivityEventBody,
  UpdateActivityEventBody,
  CopyWeekBody,
} from '@/api/schedule';
import { qk } from './query-keys';

// Re-export domain types so `routes/*` can consume them via this hook layer
// (CLAUDE §4 forbids `routes/*` importing from `api/*` directly).
export type {
  ScheduleTemplate,
  ScheduleTemplateSlot,
  ActivityEvent,
  ScheduleWeekSnapshot,
  WeekCopySummary,
  ScheduleTemplateListFilters,
  WeekSnapshotListFilters,
  ActivityEventListFilters,
  CreateScheduleTemplateBody,
  UpdateScheduleTemplateBody,
  CreateSlotBody,
  UpdateSlotBody,
  CreateActivityEventBody,
  UpdateActivityEventBody,
  CopyWeekBody,
} from '@/api/schedule';

const FIVE_MINUTES = 5 * 60 * 1000;

export function useScheduleTemplates(filters: ScheduleTemplateListFilters = {}) {
  return useQuery({
    queryKey: qk.schedule.templatesList(filters),
    queryFn: () => listScheduleTemplates(filters),
    staleTime: FIVE_MINUTES,
  });
}

export function useScheduleTemplate(id: string) {
  return useQuery({
    queryKey: qk.schedule.templateDetail(id),
    queryFn: () => getScheduleTemplate(id),
    enabled: !!id,
  });
}

export function useTemplateSlots(templateId: string) {
  return useQuery({
    queryKey: qk.schedule.templateSlots(templateId),
    queryFn: () => listTemplateSlots(templateId),
    enabled: !!templateId,
  });
}

export function useWeekSnapshots(filters: WeekSnapshotListFilters = {}) {
  return useQuery({
    queryKey: qk.schedule.weekSnapshots(filters),
    queryFn: () => listWeekSnapshots(filters),
    staleTime: FIVE_MINUTES,
  });
}

export function useActivityEvents(filters: ActivityEventListFilters = {}) {
  return useQuery({
    queryKey: qk.schedule.activityEvents(filters),
    queryFn: () => listActivityEvents(filters),
    staleTime: FIVE_MINUTES,
  });
}

export function useActivityEvent(id: string) {
  return useQuery({
    queryKey: qk.schedule.activityEventDetail(id),
    queryFn: () => getActivityEvent(id),
    enabled: !!id,
  });
}

export function useCreateScheduleTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateScheduleTemplateBody) => createScheduleTemplate(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.schedule.all });
    },
  });
}

export function useUpdateScheduleTemplate(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateScheduleTemplateBody) => updateScheduleTemplate(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.schedule.templateDetail(id) });
      void queryClient.invalidateQueries({ queryKey: qk.schedule.templatesList() });
    },
  });
}

export function useCreateSlot(templateId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateSlotBody) => createSlot(templateId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: qk.schedule.templateSlots(templateId),
      });
      void queryClient.invalidateQueries({
        queryKey: qk.schedule.templateDetail(templateId),
      });
    },
  });
}

export function useUpdateSlot(templateId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ slotId, body }: { slotId: string; body: UpdateSlotBody }) =>
      updateSlot(templateId, slotId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: qk.schedule.templateSlots(templateId),
      });
      void queryClient.invalidateQueries({
        queryKey: qk.schedule.templateDetail(templateId),
      });
    },
  });
}

export function useDeleteSlot(templateId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (slotId: string) => deleteSlot(templateId, slotId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: qk.schedule.templateSlots(templateId),
      });
      void queryClient.invalidateQueries({
        queryKey: qk.schedule.templateDetail(templateId),
      });
    },
  });
}

export function useCopyWeek() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CopyWeekBody) => copyWeek(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.schedule.weekSnapshots() });
      void queryClient.invalidateQueries({ queryKey: qk.schedule.activityEvents() });
    },
  });
}

export function useCreateActivityEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateActivityEventBody) => createActivityEvent(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.schedule.activityEvents() });
    },
  });
}

export function useUpdateActivityEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateActivityEventBody }) =>
      updateActivityEvent(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.schedule.all });
    },
  });
}

export function useDeleteActivityEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteActivityEvent(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.schedule.activityEvents() });
    },
  });
}
