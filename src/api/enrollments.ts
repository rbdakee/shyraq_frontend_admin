import { z } from 'zod';
import { apiClient } from './client';

export const EnrollmentStatusEnum = z.enum([
  'new',
  'in_processing',
  'waitlist',
  'card_created',
  'cancelled',
  'archive',
]);

export type EnrollmentStatus = z.infer<typeof EnrollmentStatusEnum>;

export const EnrollmentDtoSchema = z.object({
  id: z.string(),
  kindergartenId: z.string(),
  childId: z.string().nullable(),
  contactName: z.string(),
  contactPhone: z.string(),
  childName: z.string().nullable(),
  childDob: z.string().nullable(),
  childIin: z.string().nullable(),
  status: EnrollmentStatusEnum,
  source: z.string().nullable(),
  notes: z.string().nullable(),
  assignedTo: z.string().nullable(),
  statusChangedAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type EnrollmentDto = z.infer<typeof EnrollmentDtoSchema>;

export const EnrollmentStatusLogDtoSchema = z.object({
  id: z.string(),
  enrollmentId: z.string(),
  kindergartenId: z.string(),
  fromStatus: EnrollmentStatusEnum.nullable(),
  toStatus: EnrollmentStatusEnum,
  changedBy: z.string(),
  comment: z.string().nullable(),
  createdAt: z.string(),
});

export type EnrollmentStatusLogDto = z.infer<typeof EnrollmentStatusLogDtoSchema>;

const EnrollmentListResponseSchema = z.object({
  data: z.array(EnrollmentDtoSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

export type EnrollmentListResponse = z.infer<typeof EnrollmentListResponseSchema>;

const EnrollmentDetailResponseSchema = z.object({
  enrollment: EnrollmentDtoSchema,
  log: z.array(EnrollmentStatusLogDtoSchema),
});

export type EnrollmentDetailResponse = z.infer<typeof EnrollmentDetailResponseSchema>;

const TransitionChildSchema = z.object({ id: z.string() }).passthrough();

export type TransitionChild = z.infer<typeof TransitionChildSchema>;

export const TransitionEnrollmentResponseSchema = z.object({
  enrollment: EnrollmentDtoSchema,
  child: TransitionChildSchema.nullable().optional(),
});

export type TransitionEnrollmentResponse = z.infer<typeof TransitionEnrollmentResponseSchema>;

export interface EnrollmentListFilters {
  status?: EnrollmentStatus;
  q?: string;
  page?: number;
  limit?: number;
}

export interface CreateEnrollmentBody {
  contactName: string;
  contactPhone: string;
  childName?: string;
  childDob?: string;
  childIin?: string;
  source?: string;
  notes?: string;
  assignedTo?: string;
}

export interface UpdateEnrollmentBody {
  contactName?: string;
  contactPhone?: string;
  childName?: string;
  childDob?: string;
  childIin?: string;
  source?: string;
  notes?: string;
  assignedTo?: string;
}

export interface TransitionEnrollmentBody {
  toStatus: EnrollmentStatus;
  comment?: string;
  currentGroupId?: string;
}

export interface AssignEnrollmentBody {
  assignedTo: string;
}

export async function listEnrollments(
  filters: EnrollmentListFilters = {},
): Promise<EnrollmentListResponse> {
  const searchParams: Record<string, string> = {};
  if (filters.status) searchParams.status = filters.status;
  if (filters.q) searchParams.q = filters.q;
  if (filters.page !== undefined) searchParams.page = String(filters.page);
  if (filters.limit !== undefined) searchParams.limit = String(filters.limit);

  const data: unknown = await apiClient.get('admin/enrollments', { searchParams }).json();
  return EnrollmentListResponseSchema.parse(data);
}

export async function getEnrollment(id: string): Promise<EnrollmentDetailResponse> {
  const data: unknown = await apiClient.get(`admin/enrollments/${id}`).json();
  return EnrollmentDetailResponseSchema.parse(data);
}

export async function createEnrollment(body: CreateEnrollmentBody): Promise<EnrollmentDto> {
  const data: unknown = await apiClient.post('admin/enrollments', { json: body }).json();
  return EnrollmentDtoSchema.parse(data);
}

export async function updateEnrollment(
  id: string,
  body: UpdateEnrollmentBody,
): Promise<EnrollmentDto> {
  const data: unknown = await apiClient.patch(`admin/enrollments/${id}`, { json: body }).json();
  return EnrollmentDtoSchema.parse(data);
}

export async function transitionEnrollment(
  id: string,
  body: TransitionEnrollmentBody,
): Promise<TransitionEnrollmentResponse> {
  const data: unknown = await apiClient
    .post(`admin/enrollments/${id}/transition`, { json: body })
    .json();
  return TransitionEnrollmentResponseSchema.parse(data);
}

export async function assignEnrollment(
  id: string,
  body: AssignEnrollmentBody,
): Promise<EnrollmentDto> {
  const data: unknown = await apiClient
    .post(`admin/enrollments/${id}/assign`, { json: body })
    .json();
  return EnrollmentDtoSchema.parse(data);
}
