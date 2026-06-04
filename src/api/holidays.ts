import { z } from 'zod';
import { apiClient } from './client';

const HolidayNameSchema = z.object({
  ru: z.string().optional(),
  kk: z.string().optional(),
  kz: z.string().optional(),
  en: z.string().optional(),
});

export const HolidayResponseDtoSchema = z.object({
  id: z.string(),
  kindergarten_id: z.string(),
  date: z.string(),
  name: HolidayNameSchema,
  is_billable: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type HolidayResponseDto = z.infer<typeof HolidayResponseDtoSchema>;

const HolidayListResponseSchema = z.array(HolidayResponseDtoSchema);

export interface HolidayListFilters {
  from_date?: string;
  to_date?: string;
  is_billable?: boolean;
}

export interface CreateHolidayBody {
  date: string;
  name: { ru: string; kk?: string };
  is_billable: boolean;
}

export interface UpdateHolidayBody {
  name?: { ru: string; kk?: string };
  is_billable?: boolean;
}

export async function listHolidays(
  filters: HolidayListFilters = {},
): Promise<HolidayResponseDto[]> {
  const searchParams: Record<string, string> = {};
  if (filters.from_date) searchParams.from_date = filters.from_date;
  if (filters.to_date) searchParams.to_date = filters.to_date;
  if (filters.is_billable !== undefined) searchParams.is_billable = String(filters.is_billable);

  const data: unknown = await apiClient.get('admin/holidays', { searchParams }).json();
  return HolidayListResponseSchema.parse(data);
}

export async function getHoliday(id: string): Promise<HolidayResponseDto> {
  const data: unknown = await apiClient.get(`admin/holidays/${id}`).json();
  return HolidayResponseDtoSchema.parse(data);
}

export async function createHoliday(body: CreateHolidayBody): Promise<HolidayResponseDto> {
  const data: unknown = await apiClient.post('admin/holidays', { json: body }).json();
  return HolidayResponseDtoSchema.parse(data);
}

export async function updateHoliday(
  id: string,
  body: UpdateHolidayBody,
): Promise<HolidayResponseDto> {
  const data: unknown = await apiClient.patch(`admin/holidays/${id}`, { json: body }).json();
  return HolidayResponseDtoSchema.parse(data);
}

export async function deleteHoliday(id: string): Promise<void> {
  await apiClient.delete(`admin/holidays/${id}`);
}
