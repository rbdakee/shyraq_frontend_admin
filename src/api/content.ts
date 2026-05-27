import { z } from 'zod';
import { apiClient } from './client';

export const ContentTypeEnum = z.enum(['news', 'menu', 'schedule_pub', 'qundylyq', 'birthday']);
export type ContentType = z.infer<typeof ContentTypeEnum>;

export const ContentTargetTypeEnum = z.enum(['all', 'group', 'child']);
export type ContentTargetType = z.infer<typeof ContentTargetTypeEnum>;

export const ContentStatusEnum = z.enum(['draft', 'scheduled', 'published']);
export type ContentStatus = z.infer<typeof ContentStatusEnum>;

export const ContentI18nSchema = z
  .object({
    ru: z.string().optional(),
    kk: z.string().optional(),
  })
  .passthrough();

export type ContentI18n = z.infer<typeof ContentI18nSchema>;

export const ContentPostResponseDtoSchema = z.object({
  id: z.string(),
  kindergarten_id: z.string(),
  content_type: ContentTypeEnum,
  target_type: ContentTargetTypeEnum,
  target_group_id: z.string().nullable(),
  target_child_id: z.string().nullable(),
  title: z.string().nullable(),
  body: z.string().nullable(),
  title_i18n: ContentI18nSchema.nullable().optional(),
  body_i18n: ContentI18nSchema.nullable().optional(),
  media_urls: z.array(z.string()).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  scheduled_for: z.string().nullable(),
  published_at: z.string().nullable(),
  expires_at: z.string().nullable(),
  status: ContentStatusEnum,
  created_by: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type ContentPost = z.infer<typeof ContentPostResponseDtoSchema>;

export const ContentListResponseSchema = z.object({
  items: z.array(ContentPostResponseDtoSchema),
  cursor: z.string().nullable(),
});

export type ContentListResponse = z.infer<typeof ContentListResponseSchema>;

export interface ContentListFilters {
  content_type?: ContentType;
  status?: ContentStatus;
  target_type?: ContentTargetType;
  target_group_id?: string;
  target_child_id?: string;
  scheduled_from?: string;
  scheduled_to?: string;
  published_from?: string;
  published_to?: string;
  cursor?: string;
  limit?: number;
}

export interface CreateContentBody {
  content_type: ContentType;
  target_type: ContentTargetType;
  target_group_id?: string;
  target_child_id?: string;
  title?: string;
  body?: string;
  title_i18n?: ContentI18n;
  body_i18n?: ContentI18n;
  metadata?: Record<string, unknown>;
  scheduled_for?: string;
  expires_at?: string;
}

export interface UpdateContentBody {
  content_type?: ContentType;
  target_type?: ContentTargetType;
  target_group_id?: string | null;
  target_child_id?: string | null;
  title?: string;
  body?: string;
  title_i18n?: ContentI18n;
  body_i18n?: ContentI18n;
  metadata?: Record<string, unknown>;
  scheduled_for?: string | null;
  expires_at?: string | null;
}

type ScalarField =
  | 'content_type'
  | 'target_type'
  | 'target_group_id'
  | 'target_child_id'
  | 'title'
  | 'body'
  | 'scheduled_for'
  | 'expires_at';

type ObjectField = 'title_i18n' | 'body_i18n' | 'metadata';

const SCALAR_FIELDS: ScalarField[] = [
  'content_type',
  'target_type',
  'target_group_id',
  'target_child_id',
  'title',
  'body',
  'scheduled_for',
  'expires_at',
];

const OBJECT_FIELDS: ObjectField[] = ['title_i18n', 'body_i18n', 'metadata'];

export function buildContentFormData(
  body: CreateContentBody | UpdateContentBody,
  files?: File[],
): FormData {
  const fd = new FormData();

  for (const key of SCALAR_FIELDS) {
    const val = (body as Record<string, unknown>)[key];
    if (val !== undefined && val !== null) {
      fd.append(key, String(val));
    }
  }

  for (const key of OBJECT_FIELDS) {
    const val = (body as Record<string, unknown>)[key];
    if (val !== undefined) {
      fd.append(key, JSON.stringify(val));
    }
  }

  if (files) {
    for (const file of files) {
      fd.append('files', file);
    }
  }

  return fd;
}

function buildSearchParams(filters: ContentListFilters): Record<string, string> {
  const sp: Record<string, string> = {};
  if (filters.content_type) sp.content_type = filters.content_type;
  if (filters.status) sp.status = filters.status;
  if (filters.target_type) sp.target_type = filters.target_type;
  if (filters.target_group_id) sp.target_group_id = filters.target_group_id;
  if (filters.target_child_id) sp.target_child_id = filters.target_child_id;
  if (filters.scheduled_from) sp.scheduled_from = filters.scheduled_from;
  if (filters.scheduled_to) sp.scheduled_to = filters.scheduled_to;
  if (filters.published_from) sp.published_from = filters.published_from;
  if (filters.published_to) sp.published_to = filters.published_to;
  if (filters.limit !== undefined) sp.limit = String(filters.limit);
  if (filters.cursor) sp.cursor = filters.cursor;
  return sp;
}

export async function listContent(filters: ContentListFilters = {}): Promise<ContentListResponse> {
  const data: unknown = await apiClient
    .get('admin/content', { searchParams: buildSearchParams(filters) })
    .json();
  return ContentListResponseSchema.parse(data);
}

export async function getContent(id: string): Promise<ContentPost> {
  const data: unknown = await apiClient.get(`admin/content/${id}`).json();
  return ContentPostResponseDtoSchema.parse(data);
}

export async function createContent(body: CreateContentBody, files?: File[]): Promise<ContentPost> {
  const hasFiles = files && files.length > 0;
  const opts = hasFiles ? { body: buildContentFormData(body, files) } : { json: body };
  const data: unknown = await apiClient.post('admin/content', opts).json();
  return ContentPostResponseDtoSchema.parse(data);
}

export async function updateContent(
  id: string,
  body: UpdateContentBody,
  files?: File[],
): Promise<ContentPost> {
  // WHY multipart when files: PATCH with `files` = full-replace media_urls (OPEN_QUESTIONS A20);
  // PATCH without `files` = text/target only, media untouched.
  const hasFiles = files && files.length > 0;
  const opts = hasFiles ? { body: buildContentFormData(body, files) } : { json: body };
  const data: unknown = await apiClient.patch(`admin/content/${id}`, opts).json();
  return ContentPostResponseDtoSchema.parse(data);
}

export async function deleteContent(id: string): Promise<void> {
  await apiClient.delete(`admin/content/${id}`).json();
}

export async function publishContent(id: string): Promise<ContentPost> {
  const data: unknown = await apiClient.post(`admin/content/${id}/publish`).json();
  return ContentPostResponseDtoSchema.parse(data);
}

export async function scheduleContent(id: string, scheduled_for: string): Promise<ContentPost> {
  const data: unknown = await apiClient
    .post(`admin/content/${id}/schedule`, { json: { scheduled_for } })
    .json();
  return ContentPostResponseDtoSchema.parse(data);
}
