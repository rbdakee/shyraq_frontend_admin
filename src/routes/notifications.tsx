import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckIcon, InboxIcon, type LucideIcon } from 'lucide-react';
import MobileTopBar from '@/components/layout/mobile-top-bar';
import { cn } from '@/lib/cn';
import { useBreakpoint } from '@/hooks/use-breakpoint';

type NotificationTone = 'info' | 'warning' | 'success' | 'danger';

interface NotificationItem {
  id: string;
  icon: LucideIcon;
  tone: NotificationTone;
  title: string;
  body: string;
  ts: string;
  unread: boolean;
}

interface NotificationGroup {
  label: string;
  items: NotificationItem[];
}

const TONE_BG: Record<NotificationTone, string> = {
  info: 'var(--info-soft)',
  warning: 'var(--warning-soft)',
  success: 'var(--success-soft)',
  danger: 'var(--danger-soft)',
};

const TONE_FG: Record<NotificationTone, string> = {
  info: 'var(--info-fg)',
  warning: 'var(--warning-fg)',
  success: 'var(--success-fg)',
  danger: 'var(--danger-fg)',
};

// TODO(B18): Replace with real useNotifications hook once backend endpoint is available
function useMockNotifications(): { groups: NotificationGroup[]; totalUnread: number } {
  return {
    groups: [],
    totalUnread: 0,
  };
}

export default function NotificationsRoute() {
  const { t } = useTranslation();
  const { isMobile } = useBreakpoint();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const { groups, totalUnread } = useMockNotifications();

  if (!isMobile) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-[22px] font-bold leading-tight text-[color:var(--text-1)]">
          {t('shell.notifications')}
        </h1>
        <div className="rounded-[var(--r-lg)] border border-line bg-bg-elev p-6 text-center text-text-3">
          {t('shell.section_in_development')}
        </div>
      </div>
    );
  }

  return (
    <>
      <MobileTopBar
        title={t('shell.notifications')}
        back
        action={
          <button type="button" className="m-iconbtn ghost" aria-label={t('shell.read_all')}>
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
          {t('mobile_notif_all', { defaultValue: 'Все' })}
        </button>
        <button
          type="button"
          className={cn(filter === 'unread' && 'on')}
          onClick={() => setFilter('unread')}
        >
          {t('mobile_notif_unread', { defaultValue: 'Непрочитанные' })}
          {totalUnread > 0 && (
            <span className="ml-1.5 rounded-full bg-primary px-1.5 py-px text-[10px] font-bold text-white">
              {totalUnread}
            </span>
          )}
        </button>
      </div>

      {groups.length === 0 && (
        <div className="flex flex-col items-center py-12 text-center text-text-3">
          <InboxIcon className="mb-3 size-10 opacity-40" />
          <div className="text-[14px] font-medium">
            {t('mobile_notif_empty', { defaultValue: 'Нет уведомлений' })}
          </div>
        </div>
      )}

      {groups.map((g) => {
        const items = filter === 'unread' ? g.items.filter((n) => n.unread) : g.items;
        if (items.length === 0) return null;
        return (
          <div key={g.label}>
            <div className="m-section-h">
              <div className="m-section-title">{g.label}</div>
            </div>
            <div className="flex flex-col gap-2">
              {items.map((n) => {
                const Icon = n.icon;
                return (
                  <div
                    key={n.id}
                    className="flex gap-3 rounded-[14px] border p-3.5"
                    style={{
                      background: n.unread ? 'var(--primary-soft)' : 'var(--bg-elev)',
                      borderColor: n.unread
                        ? 'color-mix(in oklab, var(--primary) 22%, transparent)'
                        : 'var(--line)',
                    }}
                  >
                    <div
                      className="flex size-9 shrink-0 items-center justify-center rounded-[10px]"
                      style={{ background: TONE_BG[n.tone], color: TONE_FG[n.tone] }}
                    >
                      <Icon className="size-[18px]" />
                    </div>
                    <div className="flex-1">
                      <div className="text-[13.5px] font-semibold leading-tight">{n.title}</div>
                      <div className="mt-0.5 text-[12.5px] leading-snug text-text-2">{n.body}</div>
                      <div className="mt-1 text-[11px] text-text-4">{n.ts}</div>
                    </div>
                    {n.unread && (
                      <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </>
  );
}
