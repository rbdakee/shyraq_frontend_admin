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
  route: string;
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
  { id: 'more', labelKey: 'mobile_tab_more', icon: MenuIcon, route: '/more' },
];

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
  const active = getActiveTab(location.pathname);

  const invoicesBadge = useOverdueInvoicesBadge();
  const requestsBadge = usePendingRequestsBadge();

  const badgeForTab = (id: TabId): BadgeCount | null => {
    if (id === 'requests') return requestsBadge;
    if (id === 'invoices') return invoicesBadge;
    return null;
  };

  return (
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
            onClick={() => navigate(tab.route)}
            aria-current={active === tab.id ? 'page' : undefined}
          >
            <Icon />
            <span>{t(tab.labelKey)}</span>
            {showBadge && <span className="m-tab-badge">{formatBadge(badge)}</span>}
          </button>
        );
      })}
    </div>
  );
}
