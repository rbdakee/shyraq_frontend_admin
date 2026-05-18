import { z } from 'zod';
import { apiClient } from './client';

export const GroupDtoSchema = z.object({
  id: z.string(),
  kindergarten_id: z.string(),
  name: z.string(),
  capacity: z.number(),
  age_range_min: z.number().nullable(),
  age_range_max: z.number().nullable(),
  current_location_id: z.string().nullable(),
  archived_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Group = z.infer<typeof GroupDtoSchema>;

export const GroupMentorDtoSchema = z.object({
  id: z.string(),
  kindergarten_id: z.string(),
  group_id: z.string(),
  staff_member_id: z.string(),
  is_primary: z.boolean(),
  assigned_at: z.string(),
  unassigned_at: z.string().nullable(),
  created_at: z.string(),
});

export type GroupMentor = z.infer<typeof GroupMentorDtoSchema>;

export interface GroupListFilters {
  archived?: boolean;
}

export interface CreateGroupBody {
  name: string;
  capacity: number;
  age_range_min?: number;
  age_range_max?: number;
  current_location_id?: string;
}

export interface UpdateGroupBody {
  name?: string;
  capacity?: number;
  age_range_min?: number | null;
  age_range_max?: number | null;
  current_location_id?: string | null;
}

export interface AssignMentorBody {
  staff_member_id: string;
}

export async function listGroups(opts: GroupListFilters = {}): Promise<Group[]> {
  const searchParams: Record<string, string> = {};
  if (opts.archived !== undefined) searchParams.archived = String(opts.archived);

  const data: unknown = await apiClient.get('groups', { searchParams }).json();
  return z.array(GroupDtoSchema).parse(data);
}

export async function getGroup(id: string): Promise<Group> {
  const data: unknown = await apiClient.get(`groups/${id}`).json();
  return GroupDtoSchema.parse(data);
}

export async function createGroup(body: CreateGroupBody): Promise<Group> {
  const data: unknown = await apiClient.post('groups', { json: body }).json();
  return GroupDtoSchema.parse(data);
}

export async function updateGroup(id: string, body: UpdateGroupBody): Promise<Group> {
  const data: unknown = await apiClient.patch(`groups/${id}`, { json: body }).json();
  return GroupDtoSchema.parse(data);
}

export async function archiveGroup(id: string): Promise<Group> {
  const data: unknown = await apiClient.post(`groups/${id}/archive`).json();
  return GroupDtoSchema.parse(data);
}

export async function restoreGroup(id: string): Promise<Group> {
  const data: unknown = await apiClient.post(`groups/${id}/restore`).json();
  return GroupDtoSchema.parse(data);
}

export async function assignGroupMentor(
  groupId: string,
  body: AssignMentorBody,
): Promise<GroupMentor> {
  const data: unknown = await apiClient.post(`groups/${groupId}/mentor`, { json: body }).json();
  return GroupMentorDtoSchema.parse(data);
}

export async function unassignGroupMentor(groupId: string): Promise<void> {
  await apiClient.delete(`groups/${groupId}/mentor`).json();
}

export async function getGroupActiveMentor(groupId: string): Promise<GroupMentor> {
  const data: unknown = await apiClient.get(`groups/${groupId}/mentor`).json();
  return GroupMentorDtoSchema.parse(data);
}

export async function listGroupMentorHistory(groupId: string): Promise<GroupMentor[]> {
  const data: unknown = await apiClient.get(`groups/${groupId}/mentor-history`).json();
  return z.array(GroupMentorDtoSchema).parse(data);
}
