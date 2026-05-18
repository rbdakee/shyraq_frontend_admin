import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { useUiStore } from '@/stores/ui-store';
import { iconRegistry, type IconName } from '@/components/ui/icon';
import { ChevronRightIcon } from 'lucide-react';

interface NavItem {
  id: string;
  labelKey: string;
  icon: IconName;
  route: string;
  badgeWarn?: boolean;
  tagKey?: string;
}

interface NavGroup {
  labelKey: string | null;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    labelKey: null,
    items: [{ id: 'dashboard', labelKey: 'nav.dashboard', icon: 'Home', route: '/' }],
  },
  {
    labelKey: 'nav.group_pupils',
    items: [
      { id: 'enrollments', labelKey: 'nav.enrollments', icon: 'Funnel', route: '/enrollments' },
      { id: 'children', labelKey: 'nav.children', icon: 'Users', route: '/children' },
      { id: 'groups', labelKey: 'nav.groups', icon: 'Layers', route: '/groups' },
    ],
  },
  {
    labelKey: 'nav.group_staff',
    items: [
      { id: 'staff', labelKey: 'nav.staff', icon: 'IdCard', route: '/staff' },
      {
        id: 'structure',
        labelKey: 'nav.structure',
        icon: 'Building',
        route: '/structure/locations',
      },
    ],
  },
  {
    labelKey: 'nav.group_daily',
    items: [
      { id: 'schedule', labelKey: 'nav.schedule', icon: 'Calendar', route: '/schedule/templates' },
      { id: 'meals', labelKey: 'nav.meals', icon: 'Bowl', route: '/meal-plans' },
      { id: 'content', labelKey: 'nav.content', icon: 'News', route: '/content' },
    ],
  },
  {
    labelKey: 'nav.group_billing',
    items: [
      { id: 'invoices', labelKey: 'nav.invoices', icon: 'Receipt', route: '/billing/invoices' },
      { id: 'payments', labelKey: 'nav.payments', icon: 'CreditCard', route: '/billing/payments' },
      { id: 'tariffs', labelKey: 'nav.tariffs', icon: 'Tag', route: '/billing/tariff-plans' },
      { id: 'refunds', labelKey: 'nav.refunds', icon: 'Refresh', route: '/billing/refunds' },
      { id: 'discounts', labelKey: 'nav.discounts', icon: 'Gift', route: '/billing/discounts' },
      { id: 'holidays', labelKey: 'nav.holidays', icon: 'Star', route: '/billing/holidays' },
      { id: 'fiscal', labelKey: 'nav.fiscal', icon: 'Receipt', route: '/billing/fiscal-receipts' },
    ],
  },
  {
    labelKey: 'nav.group_ops',
    items: [
      { id: 'requests', labelKey: 'nav.requests', icon: 'Inbox', route: '/parent-requests' },
      { id: 'attendance', labelKey: 'nav.attendance', icon: 'CheckCircle', route: '/attendance' },
      {
        id: 'diagnostics',
        labelKey: 'nav.diagnostics',
        icon: 'Clipboard',
        route: '/diagnostics/templates',
      },
      { id: 'face', labelKey: 'nav.face', icon: 'Scan', route: '/face', tagKey: 'nav.phase_c' },
      { id: 'dlq', labelKey: 'nav.dlq', icon: 'AlertTri', route: '/operations/lifecycle-dlq' },
    ],
  },
  {
    labelKey: 'nav.group_system',
    items: [{ id: 'settings', labelKey: 'nav.settings', icon: 'Settings', route: '/settings' }],
  },
];

function getActiveNavId(pathname: string): string | null {
  if (pathname === '/') return 'dashboard';
  const segs = pathname.split('/').filter(Boolean);
  const head = segs[0];

  if (head === 'enrollments') return 'enrollments';
  if (head === 'children') return 'children';
  if (head === 'groups') return 'groups';
  if (head === 'staff') return 'staff';
  if (head === 'structure') return 'structure';
  if (head === 'schedule') return 'schedule';
  if (head === 'meal-plans') return 'meals';
  if (head === 'content') return 'content';
  if (head === 'billing') {
    if (segs[1] === 'invoices') return 'invoices';
    if (segs[1] === 'payments') return 'payments';
    if (segs[1] === 'tariff-plans') return 'tariffs';
    if (segs[1] === 'tariff-assignments') return 'tariffs';
    if (segs[1] === 'refunds') return 'refunds';
    if (segs[1] === 'discounts') return 'discounts';
    if (segs[1] === 'holidays') return 'holidays';
    if (segs[1] === 'fiscal-receipts') return 'fiscal';
    return 'invoices';
  }
  if (head === 'parent-requests') return 'requests';
  if (head === 'attendance') return 'attendance';
  if (head === 'diagnostics') return 'diagnostics';
  if (head === 'face') return 'face';
  if (head === 'operations') return 'dlq';
  if (head === 'settings') return 'settings';
  return null;
}

export default function Sidebar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const activeId = getActiveNavId(location.pathname);

  return (
    <aside
      className={cn(
        'flex flex-col border-r border-line bg-bg-sidebar sticky top-0 h-screen overflow-hidden',
        collapsed ? 'w-[var(--sidebar-w-collapsed)]' : 'w-[var(--sidebar-w)]',
      )}
    >
      <div className="flex h-[var(--topbar-h)] shrink-0 items-center gap-2.5 border-b border-line px-4">
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[13px] font-extrabold tracking-tight text-white"
          style={{
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-bright) 100%)',
          }}
        >
          Sh
        </div>
        {!collapsed && (
          <div>
            <div className="text-[15px] font-bold tracking-tight">{t('app.brand')}</div>
            <div className="text-[10.5px] font-semibold uppercase leading-none tracking-[0.05em] text-text-3">
              {t('app.admin_label')}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3">
        {NAV_GROUPS.map((group, gi) => (
          <div className="mb-1" key={gi}>
            {group.labelKey && !collapsed && (
              <div className="px-3 pb-1.5 pt-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-text-4">
                {t(group.labelKey)}
              </div>
            )}
            {group.items.map((item) => {
              const Icon = iconRegistry[item.icon];
              const isActive = activeId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-[var(--r-md)] px-2.5 py-[7px] text-[13.5px] font-medium text-text-2 transition-colors duration-75 select-none',
                    isActive
                      ? 'bg-bg-elev font-semibold text-primary-fg shadow-[var(--shyraq-shadow-1)]'
                      : 'hover:bg-bg-sunken hover:text-text-1',
                    collapsed && 'justify-center px-0',
                  )}
                  onClick={() => navigate(item.route)}
                  title={collapsed ? t(item.labelKey) : undefined}
                >
                  <Icon
                    className={cn('h-4 w-4 shrink-0', isActive ? 'text-primary' : 'text-text-3')}
                  />
                  {!collapsed && (
                    <>
                      <span>{t(item.labelKey)}</span>
                      {item.tagKey && (
                        <span className="ml-auto rounded-[var(--r-xs)] bg-neutral-soft px-[5px] py-px text-[9px] font-bold uppercase tracking-[0.04em] text-text-3">
                          {t(item.tagKey)}
                        </span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="shrink-0 border-t border-line p-2.5">
        <div className="flex items-center gap-2.5 rounded-[var(--r-md)] bg-bg-sunken p-2 hover:bg-neutral-soft cursor-pointer">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-warning-soft text-sm">
            🌱
          </div>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12.5px] font-semibold leading-tight">Shyraq</div>
                <div className="text-[11px] text-text-3">{t('shell.administrator')}</div>
              </div>
              <ChevronRightIcon className="h-3.5 w-3.5 text-text-4" />
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
