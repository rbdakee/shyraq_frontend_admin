import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { useUiStore } from '@/stores/ui-store';
import { useSessionStore } from '@/stores/session-store';
import { iconRegistry } from '@/components/ui/icon';
import { ChevronDownIcon } from 'lucide-react';
import Breadcrumbs from './breadcrumbs';
import NotificationsPanel from './notifications-panel';
import UserMenu from './user-menu';

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase();
}

export default function Topbar() {
  const { t } = useTranslation();
  const locale = useUiStore((s) => s.locale);
  const setLocale = useUiStore((s) => s.setLocale);
  const user = useSessionStore((s) => s.user);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  const displayName = user?.full_name?.split(' ')[0] ?? '';
  const avatarInitials = initials(user?.full_name ?? '');

  const BellIcon = iconRegistry.Bell;

  const handleNotifToggle = () => {
    setNotifOpen((v) => !v);
    setUserOpen(false);
  };

  const handleUserToggle = () => {
    setUserOpen((v) => !v);
    setNotifOpen(false);
  };

  return (
    <>
      <div className="sticky top-0 z-20 flex h-[var(--topbar-h)] items-center gap-3 border-b border-line bg-bg-elev px-6">
        <Breadcrumbs />
        <div className="flex-1" />
        <div className="flex items-center gap-1.5">
          <div className="inline-flex rounded-[var(--r-md)] bg-bg-sunken p-0.5 text-xs font-semibold">
            <button
              type="button"
              className={cn(
                'rounded-[var(--r-sm)] border-none px-2 py-1 cursor-pointer',
                locale === 'ru'
                  ? 'bg-bg-elev text-text-1 shadow-[var(--shyraq-shadow-1)]'
                  : 'bg-transparent text-text-3',
              )}
              onClick={() => setLocale('ru')}
            >
              RU
            </button>
            <button
              type="button"
              className={cn(
                'rounded-[var(--r-sm)] border-none px-2 py-1 cursor-pointer',
                locale === 'kk'
                  ? 'bg-bg-elev text-text-1 shadow-[var(--shyraq-shadow-1)]'
                  : 'bg-transparent text-text-3',
              )}
              onClick={() => setLocale('kk')}
            >
              KK
            </button>
          </div>

          <button
            type="button"
            className="relative inline-flex h-8 w-8 items-center justify-center rounded-[var(--r-md)] text-text-2 hover:bg-bg-sunken hover:text-text-1"
            onClick={handleNotifToggle}
            title={t('shell.notifications')}
          >
            <BellIcon className="h-4 w-4" />
          </button>

          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full bg-bg-sunken py-1 pr-2.5 pl-1 cursor-pointer hover:bg-neutral-soft"
            onClick={handleUserToggle}
          >
            <div
              className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-[color:var(--on-primary)]"
              style={{
                background: 'linear-gradient(135deg, var(--primary-soft), var(--primary))',
              }}
            >
              {avatarInitials}
            </div>
            <span className="text-[13px] font-semibold">{displayName}</span>
            <ChevronDownIcon className="h-3.5 w-3.5 text-text-3" />
          </button>
        </div>
      </div>

      <NotificationsPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
      <UserMenu open={userOpen} onClose={() => setUserOpen(false)} />
    </>
  );
}
