import { useState, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { type ColumnDef } from '@tanstack/react-table';
import { PlusIcon, EyeIcon, BanIcon, ArrowRightIcon } from 'lucide-react';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import TariffMobile from '@/routes/billing/tariff-mobile';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable } from '@/components/data-table/data-table';
import { DestructiveConfirm } from '@/components/feedback/destructive-confirm';
import {
  useTariffPlansList,
  useDeactivateTariffPlan,
  type TariffPlanResponseDto,
  type TariffType,
} from '@/hooks/use-tariff-plans';
import { formatMoney, formatDate } from '@/lib/format';
import { toI18nKey } from '@/lib/error-map';
import { DEFAULT_TIMEZONE } from '@/lib/constants';
import { TARIFF_TYPE_BADGE, TARIFF_TYPES } from './tariff-plan-constants';
import { CreateTariffPlanModal } from './tariff-plan-form';

const EMPTY_DATA: TariffPlanResponseDto[] = [];

export default function TariffPlansListPage() {
  const { t } = useTranslation('billing');
  const navigate = useNavigate();
  const tz = DEFAULT_TIMEZONE;
  const { isMobile } = useBreakpoint();

  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [deactivateId, setDeactivateId] = useState<string | null>(null);

  const filters = useMemo(
    () => ({
      is_active: activeFilter !== 'all' ? activeFilter === 'true' : undefined,
      tariff_type: typeFilter !== 'all' ? (typeFilter as TariffType) : undefined,
    }),
    [activeFilter, typeFilter],
  );

  const plansQuery = useTariffPlansList(filters);
  const data = plansQuery.data ?? EMPTY_DATA;

  const isFiltered = activeFilter !== 'all' || typeFilter !== 'all';

  const resetFilters = useCallback(() => {
    setActiveFilter('all');
    setTypeFilter('all');
  }, []);

  const columns: ColumnDef<TariffPlanResponseDto, unknown>[] = useMemo(
    () => [
      {
        id: 'name',
        header: () => t('tariff_plans.columns.name'),
        cell: ({ row }) => (
          <strong className="text-[color:var(--text-1)]">{row.original.name}</strong>
        ),
      },
      {
        id: 'type',
        header: () => t('tariff_plans.columns.type'),
        cell: ({ row }) => (
          <Badge variant={TARIFF_TYPE_BADGE[row.original.tariff_type]} dot>
            {t(`tariff_plans.type.${row.original.tariff_type}`)}
          </Badge>
        ),
      },
      {
        id: 'applies_to',
        header: () => t('tariff_plans.columns.applies_to'),
        cell: ({ row }) => (
          <span className="text-[12px] text-[color:var(--text-3)]">
            {t(`tariff_plans.applies_to.${row.original.applies_to}`)}
          </span>
        ),
      },
      {
        id: 'amount',
        header: () => t('tariff_plans.columns.amount'),
        cell: ({ row }) => <strong>{formatMoney(row.original.amount)}</strong>,
        meta: { className: 'text-right' },
      },
      {
        id: 'period',
        header: () => t('tariff_plans.columns.period'),
        cell: ({ row }) =>
          `${formatDate(row.original.valid_from, tz)} → ${row.original.valid_until ? formatDate(row.original.valid_until, tz) : '∞'}`,
      },
      {
        id: 'status',
        header: () => t('tariff_plans.columns.status'),
        cell: ({ row }) => (
          <Badge variant={row.original.is_active ? 'success' : 'neutral'} dot>
            {row.original.is_active ? t('tariff_plans.active') : t('tariff_plans.inactive')}
          </Badge>
        ),
      },
    ],
    [t, tz],
  );

  const rowActions = useMemo(
    () => [
      {
        label: t('tariff_plans.detail.title'),
        icon: <EyeIcon className="size-4" />,
        onClick: (row: TariffPlanResponseDto) => navigate(`/billing/tariff-plans/${row.id}`),
      },
      {
        label: t('tariff_plans.deactivate.button'),
        icon: <BanIcon className="size-4" />,
        onClick: (row: TariffPlanResponseDto) => setDeactivateId(row.id),
        hidden: (row: TariffPlanResponseDto) => !row.is_active,
      },
    ],
    [navigate, t],
  );

  if (isMobile) {
    return <TariffMobile />;
  }

  const toolbar = (
    <>
      <Select value={activeFilter} onValueChange={(v) => setActiveFilter(v)}>
        <SelectTrigger size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('tariff_plans.filters.all_statuses')}</SelectItem>
          <SelectItem value="true">{t('tariff_plans.active')}</SelectItem>
          <SelectItem value="false">{t('tariff_plans.inactive')}</SelectItem>
        </SelectContent>
      </Select>
      <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v)}>
        <SelectTrigger size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('tariff_plans.filters.all_types')}</SelectItem>
          {TARIFF_TYPES.map((tp) => (
            <SelectItem key={tp} value={tp}>
              {t(`tariff_plans.type.${tp}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );

  return (
    <div className="flex flex-col gap-[14px]">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold leading-tight text-[color:var(--text-1)]">
            {t('tariff_plans.title')}
          </h1>
          <div className="mt-0.5 text-[13px] text-[color:var(--text-3)]">
            {t('tariff_plans.subtitle')}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/billing/tariff-assignments"
            className="inline-flex items-center gap-1 text-[13px] text-[color:var(--primary)] hover:underline"
          >
            {t('tariff_plans.go_to_assignments')}
            <ArrowRightIcon className="size-3.5" />
          </Link>
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon className="size-4" />
            {t('tariff_plans.create_button')}
          </Button>
        </div>
      </div>

      <DataTable<TariffPlanResponseDto>
        columns={columns}
        data={data}
        isLoading={plansQuery.isPending}
        isError={plansQuery.isError}
        onRetry={() => void plansQuery.refetch()}
        isFiltered={isFiltered}
        onResetFilters={resetFilters}
        emptyTitle={t('tariff_plans.empty_title')}
        emptyDescription={t('tariff_plans.empty_description')}
        filteredEmptyTitle={t('tariff_plans.filtered_empty_title')}
        filteredEmptyDescription={t('tariff_plans.filtered_empty_description')}
        onRowClick={(row) => navigate(`/billing/tariff-plans/${row.id}`)}
        rowActions={rowActions}
        toolbar={toolbar}
      />

      <CreateTariffPlanModal open={createOpen} onOpenChange={setCreateOpen} />

      {deactivateId && (
        <DeactivateConfirmDialog id={deactivateId} onClose={() => setDeactivateId(null)} />
      )}
    </div>
  );
}

function DeactivateConfirmDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const { t } = useTranslation('billing');
  const deactivateMutation = useDeactivateTariffPlan(id);

  function handleConfirm() {
    deactivateMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success(t('tariff_plans.deactivate.success'));
        onClose();
      },
      onError: (err) => {
        toast.error(t(toI18nKey(err), { defaultValue: t('errors:unknown_error') }));
        console.error(err);
      },
    });
  }

  return (
    <DestructiveConfirm
      open
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
      title={t('tariff_plans.deactivate.title')}
      description={t('tariff_plans.deactivate.description')}
      confirmLabel={t('tariff_plans.deactivate.confirm')}
      cancelLabel={t('tariff_plans.deactivate.cancel')}
      onConfirm={handleConfirm}
      loading={deactivateMutation.isPending}
    />
  );
}
