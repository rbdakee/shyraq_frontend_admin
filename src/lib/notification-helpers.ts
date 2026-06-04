import type { TFunction } from 'i18next';
import type { NotificationDto } from '@/api/notifications';

export function formatRelativeTime(isoString: string, t: TFunction): string {
  const now = Date.now();
  const ts = new Date(isoString).getTime();
  const diffMs = now - ts;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return t('notifications:just_now');
  if (diffMin < 60) return t('notifications:time_ago_minutes', { count: diffMin });
  if (diffHours < 24) return t('notifications:time_ago_hours', { count: diffHours });
  if (diffDays < 7) return t('notifications:time_ago_days', { count: diffDays });

  const date = new Date(isoString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}.${date.getFullYear()}`;
}

export interface NotificationGroup {
  label: string;
  items: NotificationDto[];
}

export function groupNotificationsByDay(
  items: NotificationDto[],
  t: TFunction,
): NotificationGroup[] {
  const groups = new Map<string, NotificationDto[]>();

  const now = new Date();
  const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = `${yesterday.getFullYear()}-${yesterday.getMonth()}-${yesterday.getDate()}`;

  for (const item of items) {
    const d = new Date(item.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const existing = groups.get(key);
    if (existing) {
      existing.push(item);
    } else {
      groups.set(key, [item]);
    }
  }

  const result: NotificationGroup[] = [];
  for (const [key, groupItems] of groups) {
    let label: string;
    if (key === todayKey) {
      label = t('notifications:today');
    } else if (key === yesterdayKey) {
      label = t('notifications:yesterday');
    } else {
      const d = new Date(groupItems[0]!.created_at);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      label = `${day}.${month}.${d.getFullYear()}`;
    }
    result.push({ label, items: groupItems });
  }

  return result;
}

export function getEventCategory(eventKey: string): string {
  const prefix = eventKey.split('.')[0];
  if (!prefix) return 'general';
  return prefix;
}
