import { z } from 'zod';
import { apiClient } from './client';

const EventTypeEnum = z.enum(['check_in', 'check_out']);
const AttendanceMethodEnum = z.enum(['face_id', 'manual', 'otp_pickup']);
const IntradayStatusEnum = z.enum([
  'present',
  'absent',
  'sick',
  'late',
  'early_pickup',
  'on_vacation',
]);

export const AttendanceEventResponseDtoSchema = z.object({
  id: z.string(),
  kindergartenId: z.string(),
  childId: z.string(),
  eventType: EventTypeEnum,
  method: AttendanceMethodEnum,
  recordedBy: z.string().nullable().optional(),
  pickupUserId: z.string().nullable().optional(),
  pickupRequestId: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  recordedAt: z.string(),
  createdAt: z.string(),
});

export const DailyStatusResponseDtoSchema = z.object({
  id: z.string(),
  kindergartenId: z.string(),
  childId: z.string(),
  date: z.string(),
  status: IntradayStatusEnum,
  note: z.string().nullable().optional(),
  setBy: z.string().nullable().optional(),
  updatedAt: z.string(),
});

export type AttendanceEvent = z.infer<typeof AttendanceEventResponseDtoSchema>;
export type DailyStatus = z.infer<typeof DailyStatusResponseDtoSchema>;
export type AttendanceEventType = z.infer<typeof EventTypeEnum>;
export type AttendanceMethod = z.infer<typeof AttendanceMethodEnum>;
export type IntradayStatus = z.infer<typeof IntradayStatusEnum>;

export { EventTypeEnum, AttendanceMethodEnum, IntradayStatusEnum };

export interface AttendanceEventListFilters {
  childId?: string;
  groupId?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export interface DailyStatusListFilters {
  childId?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export interface PatchAttendanceBody {
  recordedAt?: string;
  notes?: string;
  pickupUserId?: string;
}

export async function listAttendanceEvents(
  filters: AttendanceEventListFilters = {},
): Promise<AttendanceEvent[]> {
  const searchParams: Record<string, string> = {};
  if (filters.childId !== undefined) searchParams.childId = filters.childId;
  if (filters.groupId !== undefined) searchParams.groupId = filters.groupId;
  if (filters.from !== undefined) searchParams.from = filters.from;
  if (filters.to !== undefined) searchParams.to = filters.to;
  if (filters.limit !== undefined) searchParams.limit = String(filters.limit);
  if (filters.offset !== undefined) searchParams.offset = String(filters.offset);

  const data: unknown = await apiClient.get('admin/attendance-events', { searchParams }).json();
  return z.array(AttendanceEventResponseDtoSchema).parse(data);
}

export async function getAttendanceEvent(eventId: string): Promise<AttendanceEvent> {
  const data: unknown = await apiClient.get(`admin/attendance-events/${eventId}`).json();
  return AttendanceEventResponseDtoSchema.parse(data);
}

export async function patchAttendanceEvent(
  eventId: string,
  body: PatchAttendanceBody,
): Promise<AttendanceEvent> {
  const data: unknown = await apiClient
    .patch(`admin/attendance-events/${eventId}`, { json: body })
    .json();
  return AttendanceEventResponseDtoSchema.parse(data);
}

export async function listDailyStatuses(
  filters: DailyStatusListFilters = {},
): Promise<DailyStatus[]> {
  const searchParams: Record<string, string> = {};
  if (filters.childId !== undefined) searchParams.childId = filters.childId;
  if (filters.from !== undefined) searchParams.from = filters.from;
  if (filters.to !== undefined) searchParams.to = filters.to;
  if (filters.limit !== undefined) searchParams.limit = String(filters.limit);
  if (filters.offset !== undefined) searchParams.offset = String(filters.offset);

  const data: unknown = await apiClient.get('admin/daily-status', { searchParams }).json();
  return z.array(DailyStatusResponseDtoSchema).parse(data);
}
