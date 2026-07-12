import { z } from 'zod';
import { apiClient } from './client';

export const StoryMediaTypeEnum = z.enum(['image', 'video']);
export type StoryMediaType = z.infer<typeof StoryMediaTypeEnum>;

// caption may arrive as a plain string (multipart text field) or, for some records,
// a JSONB i18n object — keep the schema tolerant and resolve at render time.
const StoryCaptionSchema = z.union([z.string(), z.record(z.string(), z.unknown())]).nullish();

export const GroupStoryResponseDtoSchema = z.object({
  id: z.string(),
  kindergarten_id: z.string(),
  group_id: z.string(),
  created_by: z.string(),
  media_url: z.string(),
  media_type: StoryMediaTypeEnum,
  caption: StoryCaptionSchema,
  views: z.number(),
  expires_at: z.string(),
  created_at: z.string(),
});

export type GroupStory = z.infer<typeof GroupStoryResponseDtoSchema>;

export const StoryListResponseSchema = z.object({
  items: z.array(GroupStoryResponseDtoSchema),
});

export interface StoryListFilters {
  group_id?: string;
}

export interface CreateStoryBody {
  group_id: string;
  file: File;
  caption?: string;
}

export async function listStories(filters: StoryListFilters = {}): Promise<GroupStory[]> {
  const searchParams: Record<string, string> = {};
  if (filters.group_id) searchParams.group_id = filters.group_id;

  const data: unknown = await apiClient.get('staff/stories', { searchParams }).json();
  return StoryListResponseSchema.parse(data).items;
}

export async function createStory(body: CreateStoryBody): Promise<GroupStory> {
  const fd = new FormData();
  fd.append('group_id', body.group_id);
  fd.append('file', body.file);
  if (body.caption) fd.append('caption', body.caption);

  const data: unknown = await apiClient.post('staff/stories', { body: fd }).json();
  return GroupStoryResponseDtoSchema.parse(data);
}

export async function deleteStory(id: string): Promise<void> {
  await apiClient.delete(`staff/stories/${id}`).json();
}
