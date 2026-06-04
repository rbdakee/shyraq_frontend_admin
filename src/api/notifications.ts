import { z } from 'zod';
import { apiClient } from './client';

const I18nFieldSchema = z.object({
  ru: z.string().optional(),
  kk: z.string().optional(),
  kz: z.string().optional(),
});

export const NotificationDtoSchema = z.object({
  id: z.string(),
  event_key: z.string(),
  title_i18n: I18nFieldSchema,
  body_i18n: I18nFieldSchema,
  data: z.record(z.string(), z.unknown()).nullable().optional(),
  read_at: z.string().nullable(),
  created_at: z.string(),
});

export type NotificationDto = z.infer<typeof NotificationDtoSchema>;

const NotificationListResponseSchema = z.object({
  items: z.array(NotificationDtoSchema),
  next_cursor: z.string().nullable().optional(),
});

export type NotificationListResponse = z.infer<typeof NotificationListResponseSchema>;

export interface NotificationListFilters {
  unread_only?: boolean;
  limit?: number;
  cursor?: string;
  event_key?: string;
}

export async function listNotifications(
  filters: NotificationListFilters = {},
): Promise<NotificationListResponse> {
  const searchParams: Record<string, string> = {};
  if (filters.unread_only !== undefined) searchParams.unread_only = String(filters.unread_only);
  if (filters.limit !== undefined) searchParams.limit = String(filters.limit);
  if (filters.cursor) searchParams.cursor = filters.cursor;
  if (filters.event_key) searchParams.event_key = filters.event_key;

  const data: unknown = await apiClient.get('notifications', { searchParams }).json();
  return NotificationListResponseSchema.parse(data);
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiClient.post(`notifications/${id}/read`).json();
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.post('notifications/read-all').json();
}

const NotificationPreferenceSchema = z.object({
  event_key: z.string(),
  push_enabled: z.boolean(),
  in_app_enabled: z.boolean(),
});

export type NotificationPreference = z.infer<typeof NotificationPreferenceSchema>;

const NotificationPreferencesResponseSchema = z.object({
  preferences: z.array(NotificationPreferenceSchema),
});

export type NotificationPreferencesResponse = z.infer<typeof NotificationPreferencesResponseSchema>;

export async function getNotificationPreferences(): Promise<NotificationPreferencesResponse> {
  const data: unknown = await apiClient.get('notifications/preferences').json();
  return NotificationPreferencesResponseSchema.parse(data);
}

export interface UpdatePreferenceItem {
  event_key: string;
  push_enabled?: boolean;
  in_app_enabled?: boolean;
}

export async function updateNotificationPreferences(
  preferences: UpdatePreferenceItem[],
): Promise<NotificationPreferencesResponse> {
  const data: unknown = await apiClient
    .patch('notifications/preferences', { json: { preferences } })
    .json();
  return NotificationPreferencesResponseSchema.parse(data);
}
