import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getNotificationPreferences,
  updateNotificationPreferences,
} from '@/api/notifications';
import type {
  NotificationListFilters,
  UpdatePreferenceItem,
  NotificationPreference,
} from '@/api/notifications';
import { qk } from './query-keys';

export type { NotificationPreference, UpdatePreferenceItem };

export function useNotificationsList(filters: Omit<NotificationListFilters, 'cursor'> = {}) {
  return useInfiniteQuery({
    queryKey: qk.notifications.list(filters),
    queryFn: ({ pageParam }) =>
      listNotifications({ ...filters, cursor: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
  });
}

export function useUnreadCount() {
  const query = useInfiniteQuery({
    queryKey: qk.notifications.list({ unread_only: true, limit: 100 }),
    queryFn: ({ pageParam }) =>
      listNotifications({ unread_only: true, limit: 100, cursor: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    staleTime: 60_000,
  });

  const count =
    query.data?.pages.reduce((acc, page) => acc + page.items.filter((n) => !n.read_at).length, 0) ??
    0;

  return { count, isLoading: query.isLoading };
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.notifications.all });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.notifications.all });
    },
  });
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: qk.notifications.preferences,
    queryFn: getNotificationPreferences,
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (preferences: UpdatePreferenceItem[]) => updateNotificationPreferences(preferences),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.notifications.preferences });
    },
  });
}
