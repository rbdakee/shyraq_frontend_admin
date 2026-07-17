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

const AuditActionEnum = z.enum(['create', 'update', 'delete']);

export const AttendanceEventResponseDtoSchema = z.object({
  id: z.string(),
  kindergartenId: z.string(),
  childId: z.string(),
  child_name: z.string().nullable().optional(),
  eventType: EventTypeEnum,
  method: AttendanceMethodEnum,
  recordedBy: z.string().nullable().optional(),
  recorded_by_full_name: z.string().nullable().optional(),
  pickupUserId: z.string().nullable().optional(),
  pickup_user_full_name: z.string().nullable().optional(),
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
  set_by_full_name: z.string().nullable().optional(),
  updatedAt: z.string(),
});

export const AuditLogEntrySchema = z.object({
  id: z.string(),
  action: AuditActionEnum,
  actorUserId: z.string().nullable().optional(),
  actor_full_name: z.string().nullable().optional(),
  before: z.record(z.string(), z.unknown()).nullable().optional(),
  after: z.record(z.string(), z.unknown()).nullable().optional(),
  createdAt: z.string(),
});

export type AttendanceEvent = z.infer<typeof AttendanceEventResponseDtoSchema>;
export type DailyStatus = z.infer<typeof DailyStatusResponseDtoSchema>;
export type AuditLogEntry = z.infer<typeof AuditLogEntrySchema>;
export type AttendanceEventType = z.infer<typeof EventTypeEnum>;
export type AttendanceMethod = z.infer<typeof AttendanceMethodEnum>;
export type IntradayStatus = z.infer<typeof IntradayStatusEnum>;
export type AuditAction = z.infer<typeof AuditActionEnum>;

export { EventTypeEnum, AttendanceMethodEnum, IntradayStatusEnum, AuditActionEnum };

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

export interface HistoryListFilters {
  limit?: number;
  offset?: number;
}

export interface PatchAttendanceBody {
  recordedAt?: string;
  notes?: string;
  pickupUserId?: string;
  childId?: string;
  eventType?: AttendanceEventType;
}

export interface CheckInBody {
  childId: string;
  recordedAt?: string;
  notes?: string;
}

export interface CheckOutBody {
  childId: string;
  pickupUserId: string;
  recordedAt?: string;
  notes?: string;
}

export interface SetDailyStatusBody {
  childId: string;
  date: string;
  status: IntradayStatus;
  note?: string;
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

export async function checkIn(body: CheckInBody): Promise<AttendanceEvent> {
  const data: unknown = await apiClient.post('admin/attendance/check-in', { json: body }).json();
  return AttendanceEventResponseDtoSchema.parse(data);
}

export async function checkOut(body: CheckOutBody): Promise<AttendanceEvent> {
  const data: unknown = await apiClient.post('admin/attendance/check-out', { json: body }).json();
  return AttendanceEventResponseDtoSchema.parse(data);
}

export async function deleteAttendanceEvent(eventId: string): Promise<void> {
  await apiClient.delete(`admin/attendance-events/${eventId}`);
}

export async function getAttendanceEventHistory(
  eventId: string,
  filters: HistoryListFilters = {},
): Promise<AuditLogEntry[]> {
  const searchParams: Record<string, string> = {};
  if (filters.limit !== undefined) searchParams.limit = String(filters.limit);
  if (filters.offset !== undefined) searchParams.offset = String(filters.offset);

  const data: unknown = await apiClient
    .get(`admin/attendance-events/${eventId}/history`, { searchParams })
    .json();
  return z.array(AuditLogEntrySchema).parse(data);
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

export async function setDailyStatus(body: SetDailyStatusBody): Promise<DailyStatus> {
  const data: unknown = await apiClient.post('admin/daily-status', { json: body }).json();
  return DailyStatusResponseDtoSchema.parse(data);
}
