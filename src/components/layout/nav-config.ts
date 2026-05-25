import type { IconName } from '@/components/ui/icon';

export interface NavItem {
  id: string;
  labelKey: string;
  icon: IconName;
  route: string;
  badgeWarn?: boolean;
  tagKey?: string;
}

export interface NavGroup {
  labelKey: string | null;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
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

export function getActiveNavId(pathname: string): string | null {
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
