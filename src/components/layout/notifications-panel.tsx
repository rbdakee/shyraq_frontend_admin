import { useTranslation } from 'react-i18next';
import { XIcon, InboxIcon } from 'lucide-react';
import {
  useNotificationsList,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '@/hooks/use-notifications';
import { resolveJsonbI18n, type JsonbI18n } from '@/lib/jsonb-i18n';
import { formatRelativeTime } from '@/lib/notification-helpers';

interface NotificationsPanelProps {
  open: boolean;
  onClose: () => void;
}

export default function NotificationsPanel({ open, onClose }: NotificationsPanelProps) {
  const { t, i18n } = useTranslation('notifications');
  const locale = i18n.language === 'kk' ? 'kk' : ('ru' as const);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useNotificationsList({
    limit: 20,
  });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  if (!open) return null;

  const allItems = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div
      className="fixed right-4 z-50 flex max-h-[calc(100vh-72px)] w-[380px] flex-col rounded-[12px] border border-line bg-bg-elev"
      style={{ top: 'var(--topbar-h)', boxShadow: 'var(--shyraq-shadow-3)' }}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3.5">
        <div className="text-[15px] font-bold">{t('title')}</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-[var(--r-sm)] bg-transparent px-2.5 py-1 text-xs font-semibold text-text-2 hover:bg-bg-sunken hover:text-text-1"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
          >
            {t('read_all')}
          </button>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--r-md)] text-text-2 hover:bg-bg-sunken hover:text-text-1"
            onClick={onClose}
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="px-4 py-10 text-center text-[13px] text-text-3">
            {t('common:loading')}
          </div>
        )}
        {!isLoading && allItems.length === 0 && (
          <div className="flex flex-col items-center px-4 py-10 text-center text-[13px] text-text-3">
            <InboxIcon className="mb-2 size-8 opacity-40" />
            {t('empty')}
          </div>
        )}
        {allItems.map((n) => {
          const isUnread = !n.read_at;
          const title = resolveJsonbI18n(n.title_i18n as JsonbI18n, locale);
          const body = resolveJsonbI18n(n.body_i18n as JsonbI18n, locale);
          return (
            <button
              key={n.id}
              type="button"
              className="flex w-full gap-2.5 border-b border-line px-4 py-3 text-left"
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
                <div className="mt-1 text-[11px] text-text-4">
                  {formatRelativeTime(n.created_at, t)}
                </div>
              </div>
            </button>
          );
        })}
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
