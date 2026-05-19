import { z } from 'zod';
import { apiClient } from './client';

export const ParentRequestTypeEnum = z.enum([
  'trusted_person',
  'day_off',
  'vacation',
  'late_pickup',
  'open_request',
]);

export type ParentRequestType = z.infer<typeof ParentRequestTypeEnum>;

export const ParentRequestStatusEnum = z.enum(['pending', 'accepted', 'rejected', 'cancelled']);

export type ParentRequestStatus = z.infer<typeof ParentRequestStatusEnum>;

export const RecipientTypeEnum = z.enum(['admin', 'mentor', 'specialist']);

export type RecipientType = z.infer<typeof RecipientTypeEnum>;

export const ParentRequestDtoSchema = z.object({
  id: z.string(),
  kindergarten_id: z.string(),
  child_id: z.string(),
  requester_user_id: z.string(),
  request_type: ParentRequestTypeEnum,
  status: ParentRequestStatusEnum,
  date_from: z.string().nullable(),
  date_to: z.string().nullable(),
  details: z.record(z.string(), z.unknown()),
  recipient_type: RecipientTypeEnum.nullable(),
  recipient_staff_id: z.string().nullable(),
  reviewed_by: z.string().nullable(),
  reviewed_at: z.string().nullable(),
  review_note: z.string().nullable(),
  invoice_id: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type ParentRequestDto = z.infer<typeof ParentRequestDtoSchema>;

const ParentRequestListResponseSchema = z.object({
  items: z.array(ParentRequestDtoSchema),
  next_cursor: z.string().nullable(),
});

export type ParentRequestListResponse = z.infer<typeof ParentRequestListResponseSchema>;

export const ParentRequestMessageDtoSchema = z.object({
  id: z.string(),
  kindergarten_id: z.string(),
  parent_request_id: z.string(),
  author_user_id: z.string().nullable(),
  author_staff_id: z.string().nullable(),
  body: z.string(),
  attachments: z.array(z.string()).nullable(),
  created_at: z.string(),
});

export type ParentRequestMessageDto = z.infer<typeof ParentRequestMessageDtoSchema>;

const ParentRequestMessageListResponseSchema = z.object({
  items: z.array(ParentRequestMessageDtoSchema),
  next_cursor: z.string().nullable(),
});

export type ParentRequestMessageListResponse = z.infer<
  typeof ParentRequestMessageListResponseSchema
>;

export interface ParentRequestListFilters {
  status?: ParentRequestStatus;
  type?: ParentRequestType;
  child_id?: string;
  group_id?: string;
  recipient_type?: RecipientType;
  limit?: number;
  cursor?: string;
}

export interface ReviewRequestBody {
  review_note?: string;
}

export interface AddMessageBody {
  body: string;
  attachments?: string[];
}

export interface CursorParams {
  cursor?: string;
  limit?: number;
}

export async function listParentRequests(
  filters: ParentRequestListFilters = {},
): Promise<ParentRequestListResponse> {
  const searchParams: Record<string, string> = {};
  if (filters.status) searchParams.status = filters.status;
  if (filters.type) searchParams.type = filters.type;
  if (filters.child_id) searchParams.child_id = filters.child_id;
  if (filters.group_id) searchParams.group_id = filters.group_id;
  if (filters.recipient_type) searchParams.recipient_type = filters.recipient_type;
  if (filters.limit !== undefined) searchParams.limit = String(filters.limit);
  if (filters.cursor) searchParams.cursor = filters.cursor;

  const data: unknown = await apiClient.get('admin/parent-requests', { searchParams }).json();
  return ParentRequestListResponseSchema.parse(data);
}

export async function getParentRequest(id: string): Promise<ParentRequestDto> {
  const data: unknown = await apiClient.get(`staff/parent-requests/${id}`).json();
  return ParentRequestDtoSchema.parse(data);
}

export async function acceptParentRequest(
  id: string,
  body: ReviewRequestBody = {},
): Promise<ParentRequestDto> {
  const data: unknown = await apiClient
    .post(`staff/parent-requests/${id}/accept`, { json: body })
    .json();
  return ParentRequestDtoSchema.parse(data);
}

export async function rejectParentRequest(
  id: string,
  body: ReviewRequestBody = {},
): Promise<ParentRequestDto> {
  const data: unknown = await apiClient
    .post(`staff/parent-requests/${id}/reject`, { json: body })
    .json();
  return ParentRequestDtoSchema.parse(data);
}

export async function listParentRequestMessages(
  id: string,
  params: CursorParams = {},
): Promise<ParentRequestMessageListResponse> {
  const searchParams: Record<string, string> = {};
  if (params.cursor) searchParams.cursor = params.cursor;
  if (params.limit !== undefined) searchParams.limit = String(params.limit);

  const data: unknown = await apiClient
    .get(`staff/parent-requests/${id}/messages`, { searchParams })
    .json();
  return ParentRequestMessageListResponseSchema.parse(data);
}

export async function addParentRequestMessage(
  id: string,
  body: AddMessageBody,
): Promise<ParentRequestMessageDto> {
  const data: unknown = await apiClient
    .post(`staff/parent-requests/${id}/messages`, { json: body })
    .json();
  return ParentRequestMessageDtoSchema.parse(data);
}
