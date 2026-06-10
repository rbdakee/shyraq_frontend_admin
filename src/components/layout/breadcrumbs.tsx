import { useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRightIcon } from 'lucide-react';
import { useBreadcrumbStore } from '@/stores/breadcrumb-store';

// UUID-looking segments are entity ids — never show the raw value to the user.
const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SEGMENT_LABELS: Record<string, string> = {
  enrollments: 'nav.enrollments',
  children: 'nav.children',
  groups: 'nav.groups',
  staff: 'nav.staff',
  structure: 'nav.structure',
  locations: 'nav.structure',
  cameras: 'nav.structure',
  schedule: 'nav.schedule',
  weeks: 'nav.schedule',
  'meal-plans': 'nav.meals',
  content: 'nav.content',
  qundylyq: 'nav.content',
  billing: 'nav.group_billing',
  invoices: 'nav.invoices',
  payments: 'nav.payments',
  'tariff-plans': 'nav.tariffs',
  'tariff-assignments': 'nav.tariffs',
  holidays: 'nav.holidays',
  refunds: 'nav.refunds',
  discounts: 'nav.discounts',
  'fiscal-receipts': 'nav.fiscal',
  'parent-requests': 'nav.requests',
  attendance: 'nav.attendance',
  'daily-status': 'nav.attendance',
  diagnostics: 'nav.diagnostics',
  face: 'nav.face',
  operations: 'nav.group_ops',
  'lifecycle-dlq': 'nav.dlq',
  settings: 'nav.settings',
  profile: 'shell.profile',
  new: 'actions.create',
};

// `templates` is shared by Schedule and Diagnostics — resolve by full path so the
// section's default page collapses into its parent crumb instead of mislabeling.
const PATH_LABELS: Record<string, string> = {
  '/schedule/templates': 'nav.schedule',
  '/diagnostics/templates': 'nav.diagnostics',
};

interface Crumb {
  label: string;
  path?: string;
}

function buildCrumbs(
  pathname: string,
  t: (key: string) => string,
  labels: Record<string, string>,
): Crumb[] {
  const segs = pathname.split('/').filter(Boolean);
  if (segs.length === 0) {
    return [{ label: t('nav.dashboard') }];
  }

  const crumbs: Crumb[] = [];
  let accumulated = '';

  for (let i = 0; i < segs.length; i++) {
    accumulated += '/' + segs[i];
    const seg = segs[i];
    const labelKey = PATH_LABELS[accumulated] ?? SEGMENT_LABELS[seg];
    // Registered entity label (id → name) wins; otherwise a raw id collapses to '…'.
    const label = labels[seg] ?? (labelKey ? t(labelKey) : ID_RE.test(seg) ? '…' : seg);
    const isLast = i === segs.length - 1;

    if (i > 0 && labelKey && crumbs.length > 0 && crumbs[crumbs.length - 1].label === label) {
      continue;
    }

    crumbs.push({
      label,
      path: isLast ? undefined : accumulated,
    });
  }

  return crumbs;
}

export default function Breadcrumbs() {
  const { t } = useTranslation();
  const location = useLocation();
  const labels = useBreadcrumbStore((s) => s.labels);
  const crumbs = buildCrumbs(location.pathname, t, labels);

  if (crumbs.length <= 1) {
    return (
      <div className="flex items-center gap-1.5 text-[13px] text-text-3">
        <span className="font-semibold text-text-1">{crumbs[0]?.label}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-[13px] text-text-3">
      {crumbs.map((crumb, i) => (
        <div className="contents" key={i}>
          {i > 0 && (
            <span className="text-text-4">
              <ChevronRightIcon className="h-3 w-3" />
            </span>
          )}
          {crumb.path ? (
            <Link to={crumb.path} className="hover:text-text-1 transition-colors">
              {crumb.label}
            </Link>
          ) : (
            <span className="font-semibold text-text-1">{crumb.label}</span>
          )}
        </div>
      ))}
    </div>
  );
}
