import { describe, it, expect } from 'vitest';
import {
  formatRelativeTime,
  groupNotificationsByDay,
  getEventCategory,
} from './notification-helpers';
import type { NotificationDto } from '@/api/notifications';

const mockT = ((key: string, opts?: Record<string, unknown>) => {
  if (opts?.count !== undefined) return `${key}:${opts.count}`;
  return key;
}) as unknown as Parameters<typeof formatRelativeTime>[1];

describe('formatRelativeTime', () => {
  it('returns just_now for <1min ago', () => {
    const now = new Date();
    const result = formatRelativeTime(now.toISOString(), mockT);
    expect(result).toBe('notifications:just_now');
  });

  it('returns minutes for <60min ago', () => {
    const date = new Date(Date.now() - 5 * 60_000);
    const result = formatRelativeTime(date.toISOString(), mockT);
    expect(result).toBe('notifications:time_ago_minutes:5');
  });

  it('returns hours for <24h ago', () => {
    const date = new Date(Date.now() - 3 * 3_600_000);
    const result = formatRelativeTime(date.toISOString(), mockT);
    expect(result).toBe('notifications:time_ago_hours:3');
  });

  it('returns days for <7d ago', () => {
    const date = new Date(Date.now() - 2 * 86_400_000);
    const result = formatRelativeTime(date.toISOString(), mockT);
    expect(result).toBe('notifications:time_ago_days:2');
  });

  it('returns formatted date for >7d ago', () => {
    const date = new Date(2025, 0, 15);
    const result = formatRelativeTime(date.toISOString(), mockT);
    expect(result).toBe('15.01.2025');
  });
});

describe('groupNotificationsByDay', () => {
  it('groups items by day with today/yesterday labels', () => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    const items: NotificationDto[] = [
      {
        id: '1',
        event_key: 'test.event',
        title_i18n: { ru: 'Title 1' },
        body_i18n: { ru: 'Body 1' },
        data: null,
        read_at: null,
        created_at: now.toISOString(),
      },
      {
        id: '2',
        event_key: 'test.event',
        title_i18n: { ru: 'Title 2' },
        body_i18n: { ru: 'Body 2' },
        data: null,
        read_at: null,
        created_at: yesterday.toISOString(),
      },
    ];

    const groups = groupNotificationsByDay(items, mockT);
    expect(groups).toHaveLength(2);
    expect(groups[0]!.label).toBe('notifications:today');
    expect(groups[0]!.items).toHaveLength(1);
    expect(groups[1]!.label).toBe('notifications:yesterday');
    expect(groups[1]!.items).toHaveLength(1);
  });

  it('returns empty array for no items', () => {
    const groups = groupNotificationsByDay([], mockT);
    expect(groups).toHaveLength(0);
  });
});

describe('getEventCategory', () => {
  it('returns prefix before dot', () => {
    expect(getEventCategory('attendance.checkin')).toBe('attendance');
    expect(getEventCategory('invoice.created')).toBe('invoice');
    expect(getEventCategory('payment.received')).toBe('payment');
  });

  it('returns general for key without dot', () => {
    expect(getEventCategory('something')).toBe('something');
  });

  it('returns general for empty string', () => {
    expect(getEventCategory('')).toBe('general');
  });
});
