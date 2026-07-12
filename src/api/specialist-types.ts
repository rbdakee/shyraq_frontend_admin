import { z } from 'zod';
import { apiClient } from './client';

const SpecialistTypeNameI18nSchema = z
  .object({ ru: z.string().optional(), kk: z.string().optional() })
  .passthrough();

export type SpecialistTypeNameI18n = z.infer<typeof SpecialistTypeNameI18nSchema>;

export const SpecialistTypeSchema = z.object({
  id: z.string(),
  code: z.string(),
  name_i18n: SpecialistTypeNameI18nSchema,
  is_system: z.boolean(),
  is_active: z.boolean(),
  sort_order: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type SpecialistType = z.infer<typeof SpecialistTypeSchema>;

export interface SpecialistTypeListFilters {
  include_inactive?: boolean;
}

export interface CreateSpecialistTypeBody {
  code: string;
  name_i18n: { ru?: string; kk?: string };
  is_active?: boolean;
  sort_order?: number;
}

export interface UpdateSpecialistTypeBody {
  name_i18n?: { ru?: string; kk?: string };
  is_active?: boolean;
  sort_order?: number;
}

export async function listSpecialistTypes(
  filters: SpecialistTypeListFilters = {},
): Promise<SpecialistType[]> {
  const searchParams: Record<string, string> = {};
  if (filters.include_inactive) searchParams.include_inactive = 'true';

  const data: unknown = await apiClient.get('admin/specialist-types', { searchParams }).json();
  return z.array(SpecialistTypeSchema).parse(data);
}

export async function createSpecialistType(
  body: CreateSpecialistTypeBody,
): Promise<SpecialistType> {
  const data: unknown = await apiClient.post('admin/specialist-types', { json: body }).json();
  return SpecialistTypeSchema.parse(data);
}

export async function updateSpecialistType(
  id: string,
  body: UpdateSpecialistTypeBody,
): Promise<SpecialistType> {
  const data: unknown = await apiClient
    .patch(`admin/specialist-types/${id}`, { json: body })
    .json();
  return SpecialistTypeSchema.parse(data);
}

export async function deleteSpecialistType(id: string): Promise<void> {
  // 204 No Content — do NOT call .json() (empty body).
  await apiClient.delete(`admin/specialist-types/${id}`);
}
