import { z } from 'zod';
import { apiClient } from './client';

const DayOfWeekEnum = z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);

const ActivityEventStatusEnum = z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']);

const WeekSnapshotSourceEnum = z.enum(['manual', 'cron']);

export const ScheduleTemplateSlotResponseDtoSchema = z.object({
  id: z.string(),
  dayOfWeek: DayOfWeekEnum,
  startTime: z.string(),
  endTime: z.string(),
  activityName: z.string(),
  locationId: z.string().nullable(),
  description: z.string().nullable(),
});

export const ScheduleTemplateResponseDtoSchema = z.object({
  id: z.string(),
  kindergartenId: z.string(),
  groupId: z.string().nullable(),
  name: z.string(),
  recurrence: z.string(),
  isActive: z.boolean(),
  validFrom: z.string(),
  validUntil: z.string().nullable(),
  createdAt: z.string(),
  slots: z.array(ScheduleTemplateSlotResponseDtoSchema),
});

export const ActivityEventResponseDtoSchema = z.object({
  id: z.string(),
  kindergartenId: z.string(),
  groupId: z.string(),
  templateSlotId: z.string().nullable(),
  activityName: z.string(),
  locationId: z.string().nullable(),
  startsAt: z.string(),
  endsAt: z.string().nullable(),
  status: ActivityEventStatusEnum,
  createdBy: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ScheduleWeekSnapshotResponseDtoSchema = z.object({
  id: z.string(),
  kindergartenId: z.string(),
  groupId: z.string(),
  weekStartDate: z.string(),
  source: WeekSnapshotSourceEnum,
  copiedFrom: z.string().nullable(),
  createdAt: z.string(),
});

export const WeekCopySummaryDtoSchema = z.object({
  copiedGroups: z.number(),
  skippedGroups: z.number(),
  totalEvents: z.number(),
});

export type ScheduleTemplateSlot = z.infer<typeof ScheduleTemplateSlotResponseDtoSchema>;
export type ScheduleTemplate = z.infer<typeof ScheduleTemplateResponseDtoSchema>;
export type ActivityEvent = z.infer<typeof ActivityEventResponseDtoSchema>;
export type ScheduleWeekSnapshot = z.infer<typeof ScheduleWeekSnapshotResponseDtoSchema>;
export type WeekCopySummary = z.infer<typeof WeekCopySummaryDtoSchema>;

export interface ScheduleTemplateListFilters {
  groupId?: string;
  isActive?: boolean;
}

export interface WeekSnapshotListFilters {
  groupId?: string;
  weekStartDateFrom?: string;
  weekStartDateTo?: string;
}

export interface ActivityEventListFilters {
  groupId?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: ActivityEvent['status'];
}

export interface CreateScheduleTemplateBody {
  groupId?: string;
  name: string;
  recurrence?: string;
  validFrom: string;
  validUntil?: string;
  isActive?: boolean;
}

export interface UpdateScheduleTemplateBody {
  name?: string;
  isActive?: boolean;
  validUntil?: string;
}

export interface CreateSlotBody {
  dayOfWeek: ScheduleTemplateSlot['dayOfWeek'];
  startTime: string;
  endTime: string;
  activityName: string;
  locationId?: string;
  description?: string;
}

export interface UpdateSlotBody {
  dayOfWeek?: ScheduleTemplateSlot['dayOfWeek'];
  startTime?: string;
  endTime?: string;
  activityName?: string;
  locationId?: string | null;
  description?: string | null;
}

export interface CreateActivityEventBody {
  groupId: string;
  activityName: string;
  locationId?: string;
  startsAt: string;
  endsAt?: string;
  notes?: string;
}

export interface UpdateActivityEventBody {
  activityName?: string;
  locationId?: string | null;
  startsAt?: string;
  endsAt?: string | null;
  notes?: string | null;
}

export interface CopyWeekBody {
  fromMonday: string;
}

export async function listScheduleTemplates(
  filters: ScheduleTemplateListFilters = {},
): Promise<ScheduleTemplate[]> {
  const searchParams: Record<string, string> = {};
  if (filters.groupId !== undefined) searchParams.groupId = filters.groupId;
  if (filters.isActive !== undefined) searchParams.isActive = String(filters.isActive);

  const data: unknown = await apiClient.get('admin/schedule/templates', { searchParams }).json();
  return z.array(ScheduleTemplateResponseDtoSchema).parse(data);
}

export async function createScheduleTemplate(
  body: CreateScheduleTemplateBody,
): Promise<ScheduleTemplate> {
  const data: unknown = await apiClient.post('admin/schedule/templates', { json: body }).json();
  return ScheduleTemplateResponseDtoSchema.parse(data);
}

export async function getScheduleTemplate(id: string): Promise<ScheduleTemplate> {
  const data: unknown = await apiClient.get(`admin/schedule/templates/${id}`).json();
  return ScheduleTemplateResponseDtoSchema.parse(data);
}

export async function updateScheduleTemplate(
  id: string,
  body: UpdateScheduleTemplateBody,
): Promise<ScheduleTemplate> {
  const data: unknown = await apiClient
    .patch(`admin/schedule/templates/${id}`, { json: body })
    .json();
  return ScheduleTemplateResponseDtoSchema.parse(data);
}

export async function listTemplateSlots(templateId: string): Promise<ScheduleTemplateSlot[]> {
  const data: unknown = await apiClient.get(`admin/schedule/templates/${templateId}/slots`).json();
  return z.array(ScheduleTemplateSlotResponseDtoSchema).parse(data);
}

export async function createSlot(
  templateId: string,
  body: CreateSlotBody,
): Promise<ScheduleTemplateSlot> {
  const data: unknown = await apiClient
    .post(`admin/schedule/templates/${templateId}/slots`, { json: body })
    .json();
  return ScheduleTemplateSlotResponseDtoSchema.parse(data);
}

export async function updateSlot(
  templateId: string,
  slotId: string,
  body: UpdateSlotBody,
): Promise<ScheduleTemplateSlot> {
  const data: unknown = await apiClient
    .patch(`admin/schedule/templates/${templateId}/slots/${slotId}`, { json: body })
    .json();
  return ScheduleTemplateSlotResponseDtoSchema.parse(data);
}

export async function deleteSlot(templateId: string, slotId: string): Promise<void> {
  await apiClient.delete(`admin/schedule/templates/${templateId}/slots/${slotId}`).json();
}

export async function listWeekSnapshots(
  filters: WeekSnapshotListFilters = {},
): Promise<ScheduleWeekSnapshot[]> {
  const searchParams: Record<string, string> = {};
  if (filters.groupId !== undefined) searchParams.groupId = filters.groupId;
  if (filters.weekStartDateFrom !== undefined)
    searchParams.weekStartDateFrom = filters.weekStartDateFrom;
  if (filters.weekStartDateTo !== undefined) searchParams.weekStartDateTo = filters.weekStartDateTo;

  const data: unknown = await apiClient
    .get('admin/schedule/week-snapshots', { searchParams })
    .json();
  return z.array(ScheduleWeekSnapshotResponseDtoSchema).parse(data);
}

export async function copyWeek(body: CopyWeekBody): Promise<WeekCopySummary> {
  const data: unknown = await apiClient
    .post('admin/schedule/week-snapshots/copy', { json: body })
    .json();
  return WeekCopySummaryDtoSchema.parse(data);
}

export async function listActivityEvents(
  filters: ActivityEventListFilters = {},
): Promise<ActivityEvent[]> {
  const searchParams: Record<string, string> = {};
  if (filters.groupId !== undefined) searchParams.groupId = filters.groupId;
  if (filters.dateFrom !== undefined) searchParams.dateFrom = filters.dateFrom;
  if (filters.dateTo !== undefined) searchParams.dateTo = filters.dateTo;
  if (filters.status !== undefined) searchParams.status = filters.status;

  const data: unknown = await apiClient
    .get('admin/schedule/activity-events', { searchParams })
    .json();
  return z.array(ActivityEventResponseDtoSchema).parse(data);
}

export async function getActivityEvent(id: string): Promise<ActivityEvent> {
  const data: unknown = await apiClient.get(`admin/schedule/activity-events/${id}`).json();
  return ActivityEventResponseDtoSchema.parse(data);
}

export async function createActivityEvent(body: CreateActivityEventBody): Promise<ActivityEvent> {
  const data: unknown = await apiClient
    .post('admin/schedule/activity-events', { json: body })
    .json();
  return ActivityEventResponseDtoSchema.parse(data);
}

export async function updateActivityEvent(
  id: string,
  body: UpdateActivityEventBody,
): Promise<ActivityEvent> {
  const data: unknown = await apiClient
    .patch(`admin/schedule/activity-events/${id}`, { json: body })
    .json();
  return ActivityEventResponseDtoSchema.parse(data);
}

export async function deleteActivityEvent(id: string): Promise<void> {
  await apiClient.delete(`admin/schedule/activity-events/${id}`).json();
}
