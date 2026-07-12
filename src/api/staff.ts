import { z } from 'zod';
import { apiClient } from './client';

export const StaffRoleEnum = z.enum(['admin', 'mentor', 'specialist', 'reception']);

export type StaffRole = z.infer<typeof StaffRoleEnum>;

// specialist_type is a CODE from the per-kindergarten specialist-types dictionary
// (N12) — validated by the backend, not a fixed frontend enum. Labels come from
// GET /admin/specialist-types (name_i18n). See lib/specialist-type.ts.

export const StaffMemberDtoSchema = z.object({
  id: z.string(),
  kindergarten_id: z.string(),
  user_id: z.string(),
  full_name: z.string().nullable(),
  phone: z.string().nullable(),
  role: StaffRoleEnum,
  specialist_type: z.string().nullable(),
  is_active: z.boolean(),
  hired_at: z.string().nullable(),
  fired_at: z.string().nullable(),
  archived_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type StaffMember = z.infer<typeof StaffMemberDtoSchema>;

export interface StaffListFilters {
  role?: StaffRole;
  is_active?: boolean;
  specialist_type?: string;
  archived?: boolean;
  search?: string;
}

export interface CreateStaffBody {
  full_name: string;
  phone: string;
  role: StaffRole;
  specialist_type?: string;
  hired_at?: string;
}

export interface UpdateStaffBody {
  full_name?: string;
  role?: StaffRole;
  specialist_type?: string | null;
  hired_at?: string | null;
  fired_at?: string | null;
}

export async function listStaff(filters: StaffListFilters = {}): Promise<StaffMember[]> {
  const searchParams: Record<string, string> = {};
  if (filters.role) searchParams.role = filters.role;
  if (filters.is_active !== undefined) searchParams.is_active = String(filters.is_active);
  if (filters.specialist_type) searchParams.specialist_type = filters.specialist_type;
  if (filters.archived !== undefined) searchParams.archived = String(filters.archived);
  if (filters.search) searchParams.search = filters.search;

  const data: unknown = await apiClient.get('admin/staff', { searchParams }).json();
  return z.array(StaffMemberDtoSchema).parse(data);
}

export async function getStaff(id: string): Promise<StaffMember> {
  const data: unknown = await apiClient.get(`admin/staff/${id}`).json();
  return StaffMemberDtoSchema.parse(data);
}

export async function createStaff(body: CreateStaffBody): Promise<StaffMember> {
  const data: unknown = await apiClient.post('admin/staff', { json: body }).json();
  return StaffMemberDtoSchema.parse(data);
}

export async function updateStaff(id: string, body: UpdateStaffBody): Promise<StaffMember> {
  const data: unknown = await apiClient.patch(`admin/staff/${id}`, { json: body }).json();
  return StaffMemberDtoSchema.parse(data);
}

export async function deactivateStaff(id: string): Promise<StaffMember> {
  const data: unknown = await apiClient.post(`admin/staff/${id}/deactivate`).json();
  return StaffMemberDtoSchema.parse(data);
}

export async function activateStaff(id: string): Promise<StaffMember> {
  const data: unknown = await apiClient.post(`admin/staff/${id}/activate`).json();
  return StaffMemberDtoSchema.parse(data);
}

export async function archiveStaff(id: string): Promise<StaffMember> {
  const data: unknown = await apiClient.post(`admin/staff/${id}/archive`).json();
  return StaffMemberDtoSchema.parse(data);
}

export async function restoreStaff(id: string): Promise<StaffMember> {
  const data: unknown = await apiClient.post(`admin/staff/${id}/restore`).json();
  return StaffMemberDtoSchema.parse(data);
}
