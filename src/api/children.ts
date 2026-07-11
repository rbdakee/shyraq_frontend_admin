import { z } from 'zod';
import { apiClient } from './client';

const ChildStatusEnum = z.enum(['card_created', 'active', 'archived']);

const GenderEnum = z.enum(['male', 'female']);

const GuardianRoleEnum = z.enum(['primary', 'secondary', 'nanny']);

const GuardianStatusEnum = z.enum(['pending_approval', 'approved', 'rejected', 'revoked']);

const TimelineEntryTypeEnum = z.enum([
  'check_in',
  'check_out',
  'activity',
  'meal',
  'nap',
  'note',
  'photo',
  'mood',
  'medication',
]);

export const ChildDtoSchema = z.object({
  id: z.string(),
  kindergarten_id: z.string(),
  iin: z.string().nullable(),
  full_name: z.string(),
  date_of_birth: z.string(),
  gender: GenderEnum.nullable(),
  photo_url: z.string().nullable(),
  status: ChildStatusEnum,
  current_group_id: z.string().nullable(),
  enrollment_date: z.string().nullable(),
  archived_at: z.string().nullable(),
  archive_reason: z.string().nullable(),
  medical_notes: z.string().nullable(),
  allergy_notes: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type ChildDto = z.infer<typeof ChildDtoSchema>;

export type ChildStatus = z.infer<typeof ChildStatusEnum>;

export type Gender = z.infer<typeof GenderEnum>;

export type GuardianRole = z.infer<typeof GuardianRoleEnum>;

export type GuardianStatus = z.infer<typeof GuardianStatusEnum>;

const PaginationMetaSchema = z.object({
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
});

export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;

const ChildListResponseSchema = z.object({
  data: z.array(ChildDtoSchema),
  meta: PaginationMetaSchema,
});

export type ChildListResponse = z.infer<typeof ChildListResponseSchema>;

export const GuardianDtoSchema = z.object({
  id: z.string(),
  kindergarten_id: z.string(),
  child_id: z.string(),
  user_id: z.string(),
  user_full_name: z.string().nullable(),
  user_phone: z.string().nullable(),
  role: GuardianRoleEnum,
  status: GuardianStatusEnum,
  has_approval_rights: z.boolean(),
  can_pickup: z.boolean(),
  permissions: z.record(z.string(), z.boolean()),
  approved_by: z.string().nullable(),
  approved_at: z.string().nullable(),
  revoked_by: z.string().nullable(),
  revoked_at: z.string().nullable(),
  permissions_updated_by: z.string().nullable(),
  permissions_updated_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type GuardianDto = z.infer<typeof GuardianDtoSchema>;

const ChildDetailResponseSchema = z.object({
  child: ChildDtoSchema,
  guardians: z.array(GuardianDtoSchema),
});

export type ChildDetailResponse = z.infer<typeof ChildDetailResponseSchema>;

const ReactivateChildResponseSchema = z.object({
  child: ChildDtoSchema,
  requires_new_tariff_assignment: z.boolean(),
});

export type ReactivateChildResponse = z.infer<typeof ReactivateChildResponseSchema>;

const ChildStatusHistoryDtoSchema = z.object({
  id: z.string(),
  previous_status: ChildStatusEnum,
  new_status: ChildStatusEnum,
  previous_archive_reason: z.string().nullable(),
  archive_reason: z.string().nullable(),
  changed_by_user_id: z.string(),
  changed_at: z.string(),
});

export type ChildStatusHistoryDto = z.infer<typeof ChildStatusHistoryDtoSchema>;

const StatusHistoryListResponseSchema = z.object({
  items: z.array(ChildStatusHistoryDtoSchema),
  total: z.number(),
});

export type StatusHistoryListResponse = z.infer<typeof StatusHistoryListResponseSchema>;

const ChildGroupHistoryDtoSchema = z.object({
  id: z.string(),
  child_id: z.string(),
  from_group_id: z.string().nullable(),
  to_group_id: z.string().nullable(),
  transferred_at: z.string(),
  transferred_by_staff_id: z.string(),
  reason: z.string().nullable(),
});

export type ChildGroupHistoryDto = z.infer<typeof ChildGroupHistoryDtoSchema>;

const TimelineEntryDtoSchema = z.object({
  id: z.string(),
  kindergartenId: z.string(),
  childId: z.string(),
  entryType: TimelineEntryTypeEnum,
  title: z.string().nullable().optional(),
  body: z.string().nullable().optional(),
  mediaUrls: z.array(z.string()).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  recordedBy: z.string().nullable().optional(),
  entryTime: z.string(),
  createdAt: z.string(),
});

export type TimelineEntryDto = z.infer<typeof TimelineEntryDtoSchema>;

const TimelinePageResponseSchema = z.object({
  items: z.array(TimelineEntryDtoSchema),
  nextCursor: z.string().nullable().optional(),
});

export type TimelinePageResponse = z.infer<typeof TimelinePageResponseSchema>;

const RevokeAllQrResponseSchema = z.object({
  revokedCount: z.number(),
});

export type RevokeAllQrResponse = z.infer<typeof RevokeAllQrResponseSchema>;

export interface ChildListFilters {
  status?: ChildStatus;
  current_group_id?: string;
  q?: string;
  limit?: number;
  offset?: number;
}

export interface CreateChildBody {
  full_name: string;
  date_of_birth: string;
  iin?: string;
  gender?: Gender;
  photo_url?: string;
  current_group_id?: string;
  medical_notes?: string;
  allergy_notes?: string;
}

export interface UpdateChildBody {
  full_name?: string;
  date_of_birth?: string;
  iin?: string | null;
  gender?: Gender | null;
  photo_url?: string | null;
  medical_notes?: string | null;
  allergy_notes?: string | null;
}

export interface TransferChildBody {
  to_group_id: string;
  reason?: string;
}

export interface InviteGuardianBody {
  user_phone?: string;
  user_id?: string;
  role: GuardianRole;
  can_pickup?: boolean;
}

export interface UpdateGuardianBody {
  role?: GuardianRole;
  can_pickup?: boolean;
}

export interface ApproveGuardianBody {
  grant_approval_rights?: boolean;
}

export interface OffsetPaginationParams {
  limit?: number;
  offset?: number;
}

export interface CursorPaginationParams {
  cursor?: string;
  limit?: number;
}

export async function listChildren(filters: ChildListFilters = {}): Promise<ChildListResponse> {
  const searchParams: Record<string, string> = {};
  if (filters.status) searchParams.status = filters.status;
  if (filters.current_group_id) searchParams.current_group_id = filters.current_group_id;
  if (filters.q) searchParams.q = filters.q;
  if (filters.limit !== undefined) searchParams.limit = String(filters.limit);
  if (filters.offset !== undefined) searchParams.offset = String(filters.offset);

  const data: unknown = await apiClient.get('children', { searchParams }).json();
  return ChildListResponseSchema.parse(data);
}

// WHY: the backend caps `limit` at 100 (ListChildrenQueryDto @Max(100)) — a single
// oversized page 422s. Billing lists (invoices/payments) need the full roster to
// resolve child_id -> full_name (the DTOs carry no child name), so page through 100
// at a time until `total` is reached.
const CHILDREN_PAGE_MAX = 100;

export async function listAllChildren(
  filters: Omit<ChildListFilters, 'limit' | 'offset'> = {},
): Promise<ChildDto[]> {
  const all: ChildDto[] = [];
  let offset = 0;
  for (;;) {
    const page = await listChildren({ ...filters, limit: CHILDREN_PAGE_MAX, offset });
    all.push(...page.data);
    offset += CHILDREN_PAGE_MAX;
    if (all.length >= page.meta.total || page.data.length === 0) break;
  }
  return all;
}

export async function createChild(body: CreateChildBody): Promise<ChildDto> {
  const data: unknown = await apiClient.post('children', { json: body }).json();
  return ChildDtoSchema.parse(data);
}

export async function getChild(id: string): Promise<ChildDetailResponse> {
  const data: unknown = await apiClient.get(`children/${id}`).json();
  return ChildDetailResponseSchema.parse(data);
}

export async function updateChild(id: string, body: UpdateChildBody): Promise<ChildDto> {
  const data: unknown = await apiClient.patch(`children/${id}`, { json: body }).json();
  return ChildDtoSchema.parse(data);
}

export async function setChildPhoto(id: string, photoUrl: string | null): Promise<ChildDto> {
  const data: unknown = await apiClient
    .post(`children/${id}/photo`, { json: { photo_url: photoUrl } })
    .json();
  return ChildDtoSchema.parse(data);
}

export async function assignChildGroup(id: string, groupId: string): Promise<ChildDto> {
  const data: unknown = await apiClient
    .post(`children/${id}/group`, { json: { group_id: groupId } })
    .json();
  return ChildDtoSchema.parse(data);
}

export async function unassignChildGroup(id: string): Promise<ChildDto> {
  const data: unknown = await apiClient.delete(`children/${id}/group`).json();
  return ChildDtoSchema.parse(data);
}

export async function transferChildGroup(id: string, body: TransferChildBody): Promise<ChildDto> {
  const data: unknown = await apiClient.post(`children/${id}/transfer`, { json: body }).json();
  return ChildDtoSchema.parse(data);
}

export async function archiveChild(id: string, archiveReason: string): Promise<ChildDto> {
  const data: unknown = await apiClient
    .post(`children/${id}/archive`, { json: { archive_reason: archiveReason } })
    .json();
  return ChildDtoSchema.parse(data);
}

export async function reactivateChild(id: string): Promise<ReactivateChildResponse> {
  const data: unknown = await apiClient.post(`children/${id}/reactivate`, { json: {} }).json();
  return ReactivateChildResponseSchema.parse(data);
}

// card_created → active. Requires an active tariff assignment, else 409
// child_activation_requires_tariff (the UI prompts to assign a tariff first).
export async function activateChild(id: string): Promise<ChildDto> {
  const data: unknown = await apiClient.post(`children/${id}/activate`, { json: {} }).json();
  return ChildDtoSchema.parse(data);
}

export async function listChildStatusHistory(
  id: string,
  params: OffsetPaginationParams = {},
): Promise<StatusHistoryListResponse> {
  const searchParams: Record<string, string> = {};
  if (params.limit !== undefined) searchParams.limit = String(params.limit);
  if (params.offset !== undefined) searchParams.offset = String(params.offset);

  const data: unknown = await apiClient
    .get(`children/${id}/status-history`, { searchParams })
    .json();
  return StatusHistoryListResponseSchema.parse(data);
}

export async function listChildGuardians(id: string): Promise<GuardianDto[]> {
  const data: unknown = await apiClient.get(`children/${id}/guardians`).json();
  return z.array(GuardianDtoSchema).parse(data);
}

export async function inviteChildGuardian(
  id: string,
  body: InviteGuardianBody,
): Promise<GuardianDto> {
  const data: unknown = await apiClient.post(`children/${id}/guardians`, { json: body }).json();
  return GuardianDtoSchema.parse(data);
}

export async function updateChildGuardian(
  id: string,
  guardianId: string,
  body: UpdateGuardianBody,
): Promise<GuardianDto> {
  const data: unknown = await apiClient
    .patch(`children/${id}/guardians/${guardianId}`, { json: body })
    .json();
  return GuardianDtoSchema.parse(data);
}

export async function revokeChildGuardian(id: string, guardianId: string): Promise<void> {
  await apiClient.post(`children/${id}/guardians/${guardianId}/revoke`).json();
}

export async function approveChildGuardian(
  id: string,
  guardianId: string,
  body: ApproveGuardianBody = {},
): Promise<GuardianDto> {
  const data: unknown = await apiClient
    .post(`children/${id}/guardians/${guardianId}/approve`, { json: body })
    .json();
  return GuardianDtoSchema.parse(data);
}

export async function rejectChildGuardian(id: string, guardianId: string): Promise<GuardianDto> {
  const data: unknown = await apiClient
    .post(`children/${id}/guardians/${guardianId}/reject`)
    .json();
  return GuardianDtoSchema.parse(data);
}

export async function listChildGroupHistory(id: string): Promise<ChildGroupHistoryDto[]> {
  const data: unknown = await apiClient.get(`children/${id}/group-history`).json();
  return z.array(ChildGroupHistoryDtoSchema).parse(data);
}

export async function listChildTimeline(
  id: string,
  params: CursorPaginationParams = {},
): Promise<TimelinePageResponse> {
  const searchParams: Record<string, string> = {};
  if (params.cursor) searchParams.cursor = params.cursor;
  if (params.limit !== undefined) searchParams.limit = String(params.limit);

  const data: unknown = await apiClient
    .get(`admin/children/${id}/timeline`, { searchParams })
    .json();
  return TimelinePageResponseSchema.parse(data);
}

export async function revokeAllUserQr(userId: string): Promise<RevokeAllQrResponse> {
  const data: unknown = await apiClient.post(`admin/qr/revoke-all/${userId}`, { json: {} }).json();
  return RevokeAllQrResponseSchema.parse(data);
}
