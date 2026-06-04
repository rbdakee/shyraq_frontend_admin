import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckIcon, InboxIcon } from 'lucide-react';
import MobileTopBar from '@/components/layout/mobile-top-bar';
import { cn } from '@/lib/cn';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import {
  useNotificationsList,
  useUnreadCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '@/hooks/use-notifications';
import { resolveJsonbI18n, type JsonbI18n } from '@/lib/jsonb-i18n';
import { groupNotificationsByDay, formatRelativeTime } from '@/lib/notification-helpers';

export default function NotificationsRoute() {
  const { t, i18n } = useTranslation('notifications');
  const { isMobile } = useBreakpoint();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const locale = i18n.language === 'kk' ? 'kk' : ('ru' as const);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useNotificationsList(
    filter === 'unread' ? { unread_only: true, limit: 20 } : { limit: 20 },
  );
  const { count: totalUnread } = useUnreadCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const allItems = data?.pages.flatMap((p) => p.items) ?? [];
  const groups = groupNotificationsByDay(allItems, t);

  const renderNotificationItem = (n: (typeof allItems)[0]) => {
    const isUnread = !n.read_at;
    const title = resolveJsonbI18n(n.title_i18n as JsonbI18n, locale);
    const body = resolveJsonbI18n(n.body_i18n as JsonbI18n, locale);

    if (isMobile) {
      return (
        <button
          key={n.id}
          type="button"
          className="flex w-full gap-3 rounded-[14px] border p-3.5 text-left"
          style={{
            background: isUnread ? 'var(--primary-soft)' : 'var(--bg-elev)',
            borderColor: isUnread
              ? 'color-mix(in oklab, var(--primary) 22%, transparent)'
              : 'var(--line)',
          }}
          onClick={() => {
            if (isUnread) markRead.mutate(n.id);
          }}
        >
          <div className="flex-1">
            <div className="text-[13.5px] font-semibold leading-tight">{title}</div>
            <div className="mt-0.5 text-[12.5px] leading-snug text-text-2">{body}</div>
            <div className="mt-1 text-[11px] text-text-4">
              {formatRelativeTime(n.created_at, t)}
            </div>
          </div>
          {isUnread && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />}
        </button>
      );
    }

    return (
      <button
        key={n.id}
        type="button"
        className="flex w-full gap-2.5 border-b border-line px-5 py-3 text-left hover:bg-bg-sunken"
        style={{
          background: isUnread ? 'var(--primary-soft)' : 'transparent',
          cursor: 'pointer',
        }}
        onClick={() => {
          if (isUnread) markRead.mutate(n.id);
        }}
      >
        <div
          className="mt-1.5 size-2 shrink-0 rounded-full"
          style={{ background: isUnread ? 'var(--primary)' : 'transparent' }}
        />
        <div className="flex-1">
          <div className="text-[13px] font-semibold">{title}</div>
          <div className="mt-0.5 text-[12.5px] text-text-2">{body}</div>
          <div className="mt-1 text-[11px] text-text-4">{formatRelativeTime(n.created_at, t)}</div>
        </div>
      </button>
    );
  };

  if (!isMobile) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-[22px] font-bold leading-tight text-[color:var(--text-1)]">
            {t('title')}
          </h1>
          <button
            type="button"
            className="rounded-[var(--r-md)] bg-transparent px-3 py-1.5 text-[13px] font-semibold text-text-2 hover:bg-bg-sunken hover:text-text-1"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
          >
            {t('read_all')}
          </button>
        </div>
        <div className="inline-flex rounded-[var(--r-md)] bg-bg-sunken p-0.5 text-xs font-semibold">
          <button
            type="button"
            className={cn(
              'rounded-[var(--r-sm)] border-none px-3 py-1.5 cursor-pointer text-[13px]',
              filter === 'all'
                ? 'bg-bg-elev text-text-1 shadow-[var(--shyraq-shadow-1)]'
                : 'bg-transparent text-text-3',
            )}
            onClick={() => setFilter('all')}
          >
            {t('all')}
          </button>
          <button
            type="button"
            className={cn(
              'rounded-[var(--r-sm)] border-none px-3 py-1.5 cursor-pointer text-[13px]',
              filter === 'unread'
                ? 'bg-bg-elev text-text-1 shadow-[var(--shyraq-shadow-1)]'
                : 'bg-transparent text-text-3',
            )}
            onClick={() => setFilter('unread')}
          >
            {t('unread')}
            {totalUnread > 0 && (
              <span className="ml-1.5 rounded-full bg-primary px-1.5 py-px text-[10px] font-bold text-white">
                {totalUnread}
              </span>
            )}
          </button>
        </div>
        <div className="rounded-[var(--r-lg)] border border-line bg-bg-elev overflow-hidden">
          {isLoading && (
            <div className="px-4 py-10 text-center text-[13px] text-text-3">
              {t('common:loading')}
            </div>
          )}
          {!isLoading && groups.length === 0 && (
            <div className="flex flex-col items-center py-12 text-center text-text-3">
              <InboxIcon className="mb-3 size-10 opacity-40" />
              <div className="text-[14px] font-medium">
                {filter === 'unread' ? t('empty_unread') : t('empty')}
              </div>
            </div>
          )}
          {groups.map((g) => (
            <div key={g.label}>
              <div className="border-b border-line bg-bg-sunken px-5 py-2 text-[11px] font-bold uppercase tracking-wider text-text-4">
                {g.label}
              </div>
              {g.items.map(renderNotificationItem)}
            </div>
          ))}
          {hasNextPage && (
            <button
              type="button"
              className="w-full px-4 py-3 text-center text-[12px] font-semibold text-primary hover:underline"
              onClick={() => void fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {t('common:pagination.load_more')}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <MobileTopBar
        title={t('title')}
        back
        action={
          <button
            type="button"
            className="m-iconbtn ghost"
            aria-label={t('read_all')}
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
          >
            <CheckIcon />
          </button>
        }
      />
      <div className="m-segmented" style={{ marginBottom: 14 }}>
        <button
          type="button"
          className={cn(filter === 'all' && 'on')}
          onClick={() => setFilter('all')}
        >
          {t('all')}
        </button>
        <button
          type="button"
          className={cn(filter === 'unread' && 'on')}
          onClick={() => setFilter('unread')}
        >
          {t('unread')}
          {totalUnread > 0 && (
            <span className="ml-1.5 rounded-full bg-primary px-1.5 py-px text-[10px] font-bold text-white">
              {totalUnread}
            </span>
          )}
        </button>
      </div>

      {isLoading && (
        <div className="px-4 py-10 text-center text-[13px] text-text-3">{t('common:loading')}</div>
      )}

      {!isLoading && groups.length === 0 && (
        <div className="flex flex-col items-center py-12 text-center text-text-3">
          <InboxIcon className="mb-3 size-10 opacity-40" />
          <div className="text-[14px] font-medium">
            {filter === 'unread' ? t('empty_unread') : t('empty')}
          </div>
        </div>
      )}

      {groups.map((g) => (
        <div key={g.label}>
          <div className="m-section-h">
            <div className="m-section-title">{g.label}</div>
          </div>
          <div className="flex flex-col gap-2">{g.items.map(renderNotificationItem)}</div>
        </div>
      ))}

      {hasNextPage && (
        <button
          type="button"
          className="w-full px-4 py-3 text-center text-[12px] font-semibold text-primary hover:underline"
          onClick={() => void fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {t('common:pagination.load_more')}
        </button>
      )}
    </>
  );
}
