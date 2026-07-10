import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ChevronRightIcon, BanIcon, PencilIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DestructiveConfirm } from '@/components/feedback/destructive-confirm';
import { ErrorState } from '@/components/feedback/error-state';
import { SkeletonLine, SkeletonBox } from '@/components/feedback/skeleton';
import { useTariffPlan, useDeactivateTariffPlan } from '@/hooks/use-tariff-plans';
import { useBreadcrumbLabel } from '@/hooks/use-breadcrumb-label';
import { resolveJsonbI18n } from '@/lib/jsonb-i18n';
import { formatMoney, formatDate } from '@/lib/format';
import { toI18nKey } from '@/lib/error-map';
import { DEFAULT_TIMEZONE } from '@/lib/constants';
import { TARIFF_TYPE_BADGE } from './tariff-plan-constants';
import { EditTariffPlanModal } from './tariff-plan-form';

export default function TariffPlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation('billing');
  const tz = DEFAULT_TIMEZONE;
  const locale = i18n.language as 'ru' | 'kk';

  const planQuery = useTariffPlan(id ?? '');
  const plan = planQuery.data;

  useBreadcrumbLabel(id, plan?.name);

  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const deactivateMutation = useDeactivateTariffPlan(id ?? '');

  function handleDeactivate() {
    deactivateMutation.mutate(undefined, {
      onSuccess: () => {
        setDeactivateOpen(false);
        toast.success(t('tariff_plans.deactivate.success'));
      },
      onError: (err) => {
        toast.error(t(toI18nKey(err), { defaultValue: t('errors:unknown_error') }));
        console.error(err);
      },
    });
  }

  if (planQuery.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <SkeletonLine width={200} height={14} />
        <SkeletonBox height={120} />
        <SkeletonBox height={300} />
      </div>
    );
  }

  if (planQuery.isError || !plan) {
    return (
      <ErrorState title={t('tariff_plans.detail.not_found')} onRetry={() => planQuery.refetch()} />
    );
  }

  const discountRules = plan.discount_rules;
  const hasDiscountRules =
    discountRules &&
    (discountRules.sibling_discount_pct ||
      discountRules.prepay_3m_pct ||
      discountRules.prepay_6m_pct ||
      discountRules.prepay_12m_pct ||
      discountRules.prepay_24m_pct ||
      discountRules.benefit_category);

  return (
    <div className="flex flex-col gap-[14px]">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[12px] text-[color:var(--text-3)]">
        <Link to="/billing/tariff-plans" className="hover:text-[color:var(--primary)]">
          {t('tariff_plans.title')}
        </Link>
        <ChevronRightIcon className="size-3 text-[color:var(--text-4)]" />
        <span className="text-[color:var(--text-1)]">{plan.name}</span>
      </div>

      {/* Header */}
      <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] shadow-[var(--shyraq-shadow-1)]">
        <div className="flex gap-5 p-5">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-[22px] font-bold leading-tight text-[color:var(--text-1)]">
                {plan.name}
              </h1>
              <Badge variant={plan.is_active ? 'success' : 'neutral'} dot>
                {plan.is_active ? t('tariff_plans.active') : t('tariff_plans.inactive')}
              </Badge>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[12px] text-[color:var(--text-3)]">
              <Badge variant={TARIFF_TYPE_BADGE[plan.tariff_type]} dot>
                {t(`tariff_plans.type.${plan.tariff_type}`)}
              </Badge>
              <span className="size-1 rounded-full bg-[var(--text-4)]" />
              <span>{t(`tariff_plans.applies_to.${plan.applies_to}`)}</span>
              <span className="size-1 rounded-full bg-[var(--text-4)]" />
              <span>
                {formatDate(plan.valid_from, tz)} →{' '}
                {plan.valid_until ? formatDate(plan.valid_until, tz) : '∞'}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[12px] text-[color:var(--text-3)]">
              {t('tariff_plans.columns.amount')}
            </div>
            <div className="text-[32px] font-bold leading-tight tracking-[-0.02em] text-[color:var(--text-1)]">
              {formatMoney(plan.amount)}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--line)] px-5 py-3">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <PencilIcon className="size-4" />
            {t('tariff_plans.edit.button')}
          </Button>
          {plan.is_active && (
            <Button variant="destructive" onClick={() => setDeactivateOpen(true)}>
              <BanIcon className="size-4" />
              {t('tariff_plans.deactivate.button')}
            </Button>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-[1fr_320px] gap-4">
        {/* Left column */}
        <div className="flex flex-col gap-4">
          {/* Details */}
          <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-5">
            <h3 className="mb-3 text-[15px] font-bold text-[color:var(--text-1)]">
              {t('tariff_plans.detail.details_title')}
            </h3>
            <div
              className="text-[13.5px]"
              style={{
                display: 'grid',
                gridTemplateColumns: '160px 1fr',
                gap: '8px 16px',
              }}
            >
              <span className="text-[color:var(--text-3)]">{t('tariff_plans.columns.name')}</span>
              <strong>{plan.name}</strong>

              {plan.description && (
                <>
                  <span className="text-[color:var(--text-3)]">
                    {t('tariff_plans.create.description')}
                  </span>
                  <span>{resolveJsonbI18n(plan.description, locale)}</span>
                </>
              )}

              <span className="text-[color:var(--text-3)]">{t('tariff_plans.columns.type')}</span>
              <span>{t(`tariff_plans.type.${plan.tariff_type}`)}</span>

              <span className="text-[color:var(--text-3)]">{t('tariff_plans.columns.amount')}</span>
              <strong>{formatMoney(plan.amount)}</strong>

              <span className="text-[color:var(--text-3)]">
                {t('tariff_plans.columns.applies_to')}
              </span>
              <span>{t(`tariff_plans.applies_to.${plan.applies_to}`)}</span>

              <span className="text-[color:var(--text-3)]">{t('tariff_plans.columns.period')}</span>
              <span>
                {formatDate(plan.valid_from, tz)} →{' '}
                {plan.valid_until ? formatDate(plan.valid_until, tz) : '∞'}
              </span>

              <span className="text-[color:var(--text-3)]">
                {t('tariff_plans.detail.created_at')}
              </span>
              <span>{formatDate(plan.created_at, tz)}</span>
            </div>
          </div>

          {/* Discount rules */}
          {hasDiscountRules && (
            <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-5">
              <h3 className="mb-3 text-[15px] font-bold text-[color:var(--text-1)]">
                {t('tariff_plans.create.discount_rules.title')}
              </h3>
              <div
                className="text-[13.5px]"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '200px 1fr',
                  gap: '8px 16px',
                }}
              >
                {discountRules.sibling_discount_pct !== undefined &&
                  discountRules.sibling_discount_pct > 0 && (
                    <>
                      <span className="text-[color:var(--text-3)]">
                        {t('tariff_plans.create.discount_rules.sibling_pct')}
                      </span>
                      <span>{discountRules.sibling_discount_pct}%</span>
                    </>
                  )}
                {discountRules.prepay_3m_pct !== undefined && discountRules.prepay_3m_pct > 0 && (
                  <>
                    <span className="text-[color:var(--text-3)]">
                      {t('tariff_plans.create.discount_rules.prepay_3m')}
                    </span>
                    <span>{discountRules.prepay_3m_pct}%</span>
                  </>
                )}
                {discountRules.prepay_6m_pct !== undefined && discountRules.prepay_6m_pct > 0 && (
                  <>
                    <span className="text-[color:var(--text-3)]">
                      {t('tariff_plans.create.discount_rules.prepay_6m')}
                    </span>
                    <span>{discountRules.prepay_6m_pct}%</span>
                  </>
                )}
                {discountRules.prepay_12m_pct !== undefined && discountRules.prepay_12m_pct > 0 && (
                  <>
                    <span className="text-[color:var(--text-3)]">
                      {t('tariff_plans.create.discount_rules.prepay_12m')}
                    </span>
                    <span>{discountRules.prepay_12m_pct}%</span>
                  </>
                )}
                {discountRules.prepay_24m_pct !== undefined && discountRules.prepay_24m_pct > 0 && (
                  <>
                    <span className="text-[color:var(--text-3)]">
                      {t('tariff_plans.create.discount_rules.prepay_24m')}
                    </span>
                    <span>{discountRules.prepay_24m_pct}%</span>
                  </>
                )}
                {discountRules.benefit_category && (
                  <>
                    <span className="text-[color:var(--text-3)]">
                      {t('tariff_plans.create.discount_rules.benefit_category')}
                    </span>
                    <span>{discountRules.benefit_category}</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right column - meta */}
        <div className="flex flex-col gap-4">
          <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-4">
            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[12.5px]">
              <span className="text-[color:var(--text-3)]">ID</span>
              <span className="font-[JetBrains_Mono,ui-monospace,monospace] text-[color:var(--text-1)]">
                {plan.id.slice(0, 8)}
              </span>
              <span className="text-[color:var(--text-3)]">
                {t('tariff_plans.detail.created_at')}
              </span>
              <span className="text-[color:var(--text-1)]">{formatDate(plan.created_at, tz)}</span>
              <span className="text-[color:var(--text-3)]">
                {t('tariff_plans.detail.updated_at')}
              </span>
              <span className="text-[color:var(--text-1)]">{formatDate(plan.updated_at, tz)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Deactivate confirm */}
      <DestructiveConfirm
        open={deactivateOpen}
        onOpenChange={setDeactivateOpen}
        title={t('tariff_plans.deactivate.title')}
        description={t('tariff_plans.deactivate.description')}
        confirmLabel={t('tariff_plans.deactivate.confirm')}
        cancelLabel={t('tariff_plans.deactivate.cancel')}
        onConfirm={handleDeactivate}
        loading={deactivateMutation.isPending}
      />

      {/* Edit modal — remounts on each open so defaultValues track the latest plan */}
      {editOpen && <EditTariffPlanModal plan={plan} onClose={() => setEditOpen(false)} />}
    </div>
  );
}
