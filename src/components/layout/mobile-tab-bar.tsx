import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  HomeIcon,
  UsersIcon,
  InboxIcon,
  ReceiptIcon,
  MenuIcon,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { iconRegistry } from '@/components/ui/icon';
import { NAV_GROUPS, getActiveNavId } from './nav-config';
import {
  useOverdueInvoicesBadge,
  usePendingRequestsBadge,
  type BadgeCount,
} from '@/hooks/use-mobile-badges';
import { MOBILE_BADGE_MAX } from '@/lib/constants';

type TabId = 'dashboard' | 'children' | 'requests' | 'invoices' | 'more';

interface TabDef {
  id: TabId;
  labelKey: string;
  icon: LucideIcon;
  route: string | null;
}

const TABS: TabDef[] = [
  { id: 'dashboard', labelKey: 'mobile_tab_home', icon: HomeIcon, route: '/' },
  { id: 'children', labelKey: 'mobile_tab_children', icon: UsersIcon, route: '/children' },
  {
    id: 'requests',
    labelKey: 'mobile_tab_requests',
    icon: InboxIcon,
    route: '/parent-requests',
  },
  {
    id: 'invoices',
    labelKey: 'mobile_tab_invoices',
    icon: ReceiptIcon,
    route: '/billing/invoices',
  },
  { id: 'more', labelKey: 'mobile_tab_more', icon: MenuIcon, route: null },
];

const PRIMARY_TAB_ROUTES = new Set(
  TABS.filter((tab) => tab.route !== null).map((tab) => tab.route as string),
);

function formatBadge(badge: BadgeCount): string {
  if (badge.hasMore || badge.count > MOBILE_BADGE_MAX) return `${MOBILE_BADGE_MAX}+`;
  return String(badge.count);
}

function getActiveTab(pathname: string): TabId {
  if (pathname === '/') return 'dashboard';
  if (pathname.startsWith('/children')) return 'children';
  if (pathname.startsWith('/parent-requests')) return 'requests';
  if (pathname.startsWith('/billing/invoices')) return 'invoices';
  return 'more';
}

export default function MobileTabBar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const active = getActiveTab(location.pathname);

  const invoicesBadge = useOverdueInvoicesBadge();
  const requestsBadge = usePendingRequestsBadge();

  const badgeForTab = (id: TabId): BadgeCount | null => {
    if (id === 'requests') return requestsBadge;
    if (id === 'invoices') return invoicesBadge;
    return null;
  };

  const handleTabClick = (tab: TabDef): void => {
    if (tab.id === 'more') {
      setMoreOpen(true);
      return;
    }
    if (tab.route) navigate(tab.route);
  };

  const handleNavItemClick = (route: string): void => {
    setMoreOpen(false);
    navigate(route);
  };

  const activeNavId = getActiveNavId(location.pathname);

  return (
    <>
      <div className="m-tabbar">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const badge = badgeForTab(tab.id);
          const showBadge = badge !== null && (badge.count > 0 || badge.hasMore);
          return (
            <button
              key={tab.id}
              type="button"
              className={cn('m-tab', active === tab.id && 'active')}
              onClick={() => handleTabClick(tab)}
              aria-current={active === tab.id ? 'page' : undefined}
            >
              <Icon />
              <span>{t(tab.labelKey)}</span>
              {showBadge && <span className="m-tab-badge">{formatBadge(badge)}</span>}
            </button>
          );
        })}
      </div>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="right" className="w-[88vw] max-w-sm overflow-y-auto p-0">
          <SheetHeader className="border-b border-line">
            <SheetTitle>{t('mobile_tab_more')}</SheetTitle>
            <SheetDescription className="sr-only">{t('mobile_more_description')}</SheetDescription>
          </SheetHeader>
          <nav className="px-2 py-3">
            {NAV_GROUPS.map((group, gi) => {
              const visibleItems = group.items.filter(
                (item) => !PRIMARY_TAB_ROUTES.has(item.route),
              );
              if (visibleItems.length === 0) return null;
              return (
                <div key={gi} className="mb-2">
                  {group.labelKey && (
                    <div className="px-3 pb-1.5 pt-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-text-4">
                      {t(group.labelKey)}
                    </div>
                  )}
                  {visibleItems.map((item) => {
                    const Icon = iconRegistry[item.icon];
                    const isActive = activeNavId === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={cn(
                          'flex w-full items-center gap-2.5 rounded-[var(--r-md)] px-2.5 py-2.5 text-[14px] font-medium text-text-2 transition-colors',
                          isActive
                            ? 'bg-bg-elev font-semibold text-primary-fg shadow-[var(--shyraq-shadow-1)]'
                            : 'hover:bg-bg-sunken hover:text-text-1',
                        )}
                        onClick={() => handleNavItemClick(item.route)}
                      >
                        <Icon
                          className={cn(
                            'h-4 w-4 shrink-0',
                            isActive ? 'text-primary' : 'text-text-3',
                          )}
                        />
                        <span>{t(item.labelKey)}</span>
                        {item.tagKey && (
                          <span className="ml-auto rounded-[var(--r-xs)] bg-neutral-soft px-[5px] py-px text-[9px] font-bold uppercase tracking-[0.04em] text-text-3">
                            {t(item.tagKey)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
