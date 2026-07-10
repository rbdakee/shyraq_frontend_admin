import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ChevronRightIcon,
  FunnelIcon,
  LayersIcon,
  IdCardIcon,
  CalendarIcon,
  SoupIcon,
  NewspaperIcon,
  CreditCardIcon,
  TagIcon,
  GiftIcon,
  RefreshCwIcon,
  StarIcon,
  ReceiptIcon,
  ClipboardIcon,
  ScanIcon,
  TriangleAlertIcon,
  LogOutIcon,
  SettingsIcon,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useSessionStore } from '@/stores/session-store';
import { useLogout } from '@/hooks/use-auth';
import { getInitials } from '@/lib/format';
import type { LucideIcon } from 'lucide-react';

interface DrawerItem {
  icon: LucideIcon;
  label: string;
  sub?: string;
  route: string;
  tone?: 'warn' | 'info' | 'danger';
  badge?: number;
  tagKey?: string;
}

interface DrawerSection {
  title: string;
  items: DrawerItem[];
}

export default function MobileMoreMenu() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useSessionStore((s) => s.user);
  const kg = useSessionStore((s) => s.currentKindergarten);
  const logoutMutation = useLogout();

  const sections: DrawerSection[] = [
    {
      title: t('nav.group_pupils'),
      items: [
        {
          icon: FunnelIcon,
          label: t('nav.enrollments'),
          sub: t('mobile_more_funnel', { defaultValue: 'Воронка зачисления' }),
          route: '/enrollments',
          tone: 'warn',
        },
        {
          icon: LayersIcon,
          label: t('nav.groups'),
          route: '/groups',
        },
        {
          icon: IdCardIcon,
          label: t('nav.staff'),
          route: '/staff',
        },
      ],
    },
    {
      title: t('nav.group_daily'),
      items: [
        {
          icon: CalendarIcon,
          label: t('nav.schedule'),
          route: '/schedule/templates',
          tone: 'info',
        },
        {
          icon: SoupIcon,
          label: t('nav.meals'),
          route: '/meal-plans',
        },
        {
          icon: NewspaperIcon,
          label: t('nav.content'),
          route: '/content',
        },
      ],
    },
    {
      title: t('nav.group_billing'),
      items: [
        {
          icon: CreditCardIcon,
          label: t('nav.payments'),
          route: '/billing/payments',
        },
        {
          icon: TagIcon,
          label: t('nav.tariffs'),
          route: '/billing/tariff-plans',
        },
        {
          icon: GiftIcon,
          label: t('nav.discounts'),
          route: '/billing/discounts',
        },
        {
          icon: RefreshCwIcon,
          label: t('nav.refunds'),
          route: '/billing/refunds',
        },
        {
          icon: StarIcon,
          label: t('nav.holidays'),
          route: '/billing/holidays',
        },
        {
          icon: ReceiptIcon,
          label: t('nav.fiscal'),
          route: '/billing/fiscal-receipts',
        },
      ],
    },
    {
      title: t('nav.group_ops'),
      items: [
        {
          icon: ClipboardIcon,
          label: t('nav.diagnostics'),
          route: '/diagnostics/templates',
        },
        {
          icon: ScanIcon,
          label: t('nav.face'),
          route: '/face',
          tagKey: 'nav.phase_c',
        },
        {
          icon: TriangleAlertIcon,
          label: t('nav.dlq'),
          route: '/operations/lifecycle-dlq',
          tone: 'danger',
        },
      ],
    },
  ];

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSettled: () => {
        navigate('/login');
      },
    });
  };

  const toneClasses: Record<string, string> = {
    warn: 'm-drawer-ic warn',
    info: 'm-drawer-ic info',
    danger: 'm-drawer-ic danger',
  };

  return (
    <div className="flex flex-col gap-0">
      {/* Profile card */}
      <div
        className="m-card flex items-center gap-3"
        role="button"
        tabIndex={0}
        onClick={() => navigate('/profile')}
      >
        <div
          className="m-avatar lg"
          style={{ background: 'linear-gradient(135deg, #E4C2F0, #B484E0)' }}
        >
          {getInitials(user?.full_name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-base font-bold tracking-tight">{user?.full_name ?? ''}</div>
          <div className="text-[12.5px] text-text-3">
            {t('shell.administrator')} · {kg?.name ?? ''}
          </div>
          <div className="mt-1 text-[12px] font-semibold text-primary">
            {t('shell.switch_kg')} →
          </div>
        </div>
        <ChevronRightIcon className="size-[18px] text-text-4" />
      </div>

      {/* Sections */}
      {sections.map((section) => (
        <div key={section.title}>
          <div className="m-drawer-section">{section.title}</div>
          <div className="m-card flush">
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.route}
                  type="button"
                  className="m-drawer-item"
                  onClick={() => navigate(item.route)}
                >
                  <div className={cn('m-drawer-ic', item.tone && toneClasses[item.tone])}>
                    <Icon />
                  </div>
                  <div className="flex-1">
                    <div>{item.label}</div>
                    {item.sub && <div className="text-[11.5px] text-text-3">{item.sub}</div>}
                  </div>
                  {item.tagKey && (
                    <span className="rounded-[var(--r-xs)] bg-neutral-soft px-[5px] py-px text-[9px] font-bold uppercase tracking-[0.04em] text-text-3">
                      {t(item.tagKey)}
                    </span>
                  )}
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="m-drawer-badge warn">{item.badge}</span>
                  )}
                  <ChevronRightIcon className="size-4 text-text-4" />
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Settings */}
      <div className="m-card flush" style={{ marginTop: 12 }}>
        <button type="button" className="m-drawer-item" onClick={() => navigate('/settings')}>
          <div className="m-drawer-ic">
            <SettingsIcon />
          </div>
          <div className="flex-1">{t('nav.settings')}</div>
          <ChevronRightIcon className="size-4 text-text-4" />
        </button>
      </div>

      {/* Logout */}
      <div className="m-card flush" style={{ marginTop: 18 }}>
        <button
          type="button"
          className="m-drawer-item"
          style={{ color: 'var(--danger)' }}
          onClick={handleLogout}
        >
          <div className="m-drawer-ic danger">
            <LogOutIcon />
          </div>
          <div className="flex-1">{t('actions.logout')}</div>
        </button>
      </div>

      {/* Version */}
      <div className="mt-4 pb-6 text-center text-[11px] text-text-4">
        Shyraq Admin · v{import.meta.env.VITE_APP_VERSION ?? '1.0.0'}
      </div>
    </div>
  );
}
