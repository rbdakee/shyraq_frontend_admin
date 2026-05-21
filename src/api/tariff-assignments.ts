import { z } from 'zod';
import { apiClient } from './client';

export const TariffAssignmentResponseDtoSchema = z.object({
  id: z.string(),
  kindergarten_id: z.string(),
  child_id: z.string(),
  tariff_plan_id: z.string(),
  custom_amount: z.number().nullable(),
  custom_reason: z.string().nullable(),
  valid_from: z.string(),
  valid_until: z.string().nullable(),
  assigned_by: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type TariffAssignmentResponseDto = z.infer<typeof TariffAssignmentResponseDtoSchema>;

const TariffAssignmentListResponseSchema = z.array(TariffAssignmentResponseDtoSchema);

export interface TariffAssignmentListFilters {
  child_id?: string;
  tariff_plan_id?: string;
  active_on?: string;
}

export interface CreateTariffAssignmentBody {
  child_id: string;
  tariff_plan_id: string;
  custom_amount?: number | null;
  custom_reason?: string | null;
  valid_from: string;
  valid_until?: string | null;
}

export interface UpdateTariffAssignmentBody {
  custom_amount?: number | null;
  custom_reason?: string | null;
  valid_until?: string | null;
}

export async function listTariffAssignments(
  filters: TariffAssignmentListFilters = {},
): Promise<TariffAssignmentResponseDto[]> {
  const searchParams: Record<string, string> = {};
  if (filters.child_id) searchParams.child_id = filters.child_id;
  if (filters.tariff_plan_id) searchParams.tariff_plan_id = filters.tariff_plan_id;
  if (filters.active_on) searchParams.active_on = filters.active_on;

  const data: unknown = await apiClient.get('admin/tariff-assignments', { searchParams }).json();
  return TariffAssignmentListResponseSchema.parse(data);
}

export async function getTariffAssignment(id: string): Promise<TariffAssignmentResponseDto> {
  const data: unknown = await apiClient.get(`admin/tariff-assignments/${id}`).json();
  return TariffAssignmentResponseDtoSchema.parse(data);
}

export async function createTariffAssignment(
  body: CreateTariffAssignmentBody,
): Promise<TariffAssignmentResponseDto> {
  const data: unknown = await apiClient.post('admin/tariff-assignments', { json: body }).json();
  return TariffAssignmentResponseDtoSchema.parse(data);
}

export async function updateTariffAssignment(
  id: string,
  body: UpdateTariffAssignmentBody,
): Promise<TariffAssignmentResponseDto> {
  const data: unknown = await apiClient
    .patch(`admin/tariff-assignments/${id}`, { json: body })
    .json();
  return TariffAssignmentResponseDtoSchema.parse(data);
}

export async function closeTariffAssignment(id: string): Promise<TariffAssignmentResponseDto> {
  const data: unknown = await apiClient.post(`admin/tariff-assignments/${id}/close`).json();
  return TariffAssignmentResponseDtoSchema.parse(data);
}
