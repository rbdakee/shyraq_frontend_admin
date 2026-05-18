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

export interface ListGroupsOptions {
  archived?: boolean;
}

// TODO(B6): expand groups domain (CRUD, mentors, children, deactivate) — minimal read created in B4 for child list filter/transfer/create select
export async function listGroups(opts: ListGroupsOptions = {}): Promise<Group[]> {
  const searchParams: Record<string, string> = {};
  if (opts.archived !== undefined) searchParams.archived = String(opts.archived);

  const data: unknown = await apiClient.get('groups', { searchParams }).json();
  return z.array(GroupDtoSchema).parse(data);
}
