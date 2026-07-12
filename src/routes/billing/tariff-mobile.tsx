import { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { PlusIcon, ChevronRightIcon, BanIcon, XCircleIcon, RefreshCwIcon } from 'lucide-react';

import MobileTopBar from '@/components/layout/mobile-top-bar';
import { Badge } from '@/components/ui/badge';
import { DestructiveConfirm } from '@/components/feedback/destructive-confirm';
import {
  useTariffPlansList,
  useDeactivateTariffPlanById,
  type TariffPlanResponseDto,
} from '@/hooks/use-tariff-plans';
import {
  useTariffAssignmentsList,
  useCloseTariffAssignment,
  type TariffAssignmentResponseDto,
} from '@/hooks/use-tariff-assignments';
import { useAllChildren } from '@/hooks/use-children';
import { formatMoney } from '@/lib/format';
import { toI18nKey } from '@/lib/error-map';
import {
  CreateTariffPlanModal,
  EditTariffPlanModal,
} from '@/routes/billing/tariff-plans/tariff-plan-form';
import { ReplaceAssignmentModal } from '@/routes/billing/tariff-assignments/replace-assignment-modal';

type TabKey = 'plans' | 'assignments';

export default function TariffMobile() {
  const { t } = useTranslation('billing');
  const navigate = useNavigate();
  const location = useLocation();

  const initialTab: TabKey = location.pathname.includes('tariff-assignments')
    ? 'assignments'
    : 'plans';
  const [tab, setTab] = useState<TabKey>(initialTab);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<TariffPlanResponseDto | null>(null);
  const [deactivatingPlanId, setDeactivatingPlanId] = useState<string | null>(null);
  const [closingAssignmentId, setClosingAssignmentId] = useState<string | null>(null);
  const [replaceTarget, setReplaceTarget] = useState<TariffAssignmentResponseDto | null>(null);

  const plansQuery = useTariffPlansList({});
  const plans = plansQuery.data ?? [];
  const activePlans = plans.filter((p) => p.is_active);

  const assignmentsQuery = useTariffAssignmentsList({});
  const assignments = assignmentsQuery.data ?? [];

  const childrenQuery = useAllChildren();
  const childrenMap = new Map((childrenQuery.data ?? []).map((c) => [c.id, c.full_name]));

  const deactivateMutation = useDeactivateTariffPlanById();
  const closeMutation = useCloseTariffAssignment();

  const handleDeactivate = useCallback(
    (planId: string) => {
      deactivateMutation.mutate(planId, {
        onSuccess: () => {
          setDeactivatingPlanId(null);
          toast.success(t('tariff_plans.deactivate.success'));
        },
        onError: (err) => {
          toast.error(t(toI18nKey(err), { defaultValue: t('errors:unknown_error') }));
          console.error(err);
        },
      });
    },
    [deactivateMutation, t],
  );

  const handleCloseAssignment = useCallback(
    (assignmentId: string) => {
      closeMutation.mutate(assignmentId, {
        onSuccess: () => {
          setClosingAssignmentId(null);
          toast.success(t('tariff_assignments.close.success'));
        },
        onError: (err) => {
          toast.error(t(toI18nKey(err), { defaultValue: t('errors:unknown_error') }));
          console.error(err);
        },
      });
    },
    [closeMutation, t],
  );

  function handleTabSwitch(newTab: TabKey) {
    setTab(newTab);
    if (newTab === 'plans') {
      navigate('/billing/tariff-plans', { replace: true });
    } else {
      navigate('/billing/tariff-assignments', { replace: true });
    }
  }

  return (
    <>
      <MobileTopBar
        title={t('mobile.tariffs_title')}
        sub={t('mobile.tariffs_sub', {
          plans: plans.length,
          assignments: assignments.length,
        })}
        action={
          <button
            type="button"
            className="m-iconbtn primary"
            aria-label={t('tariff_plans.create_button')}
            onClick={() => setCreateOpen(true)}
          >
            <PlusIcon className="size-5" />
          </button>
        }
      />

      <>
        <div className="m-segmented" style={{ marginBottom: 14 }}>
          <button
            type="button"
            className={tab === 'plans' ? 'on' : ''}
            onClick={() => handleTabSwitch('plans')}
          >
            {t('mobile.tariffs_tab_plans')}
            <span className="ml-1.5 rounded-full bg-[var(--bg-sunken)] px-1.5 text-[10px]">
              {plans.length}
            </span>
          </button>
          <button
            type="button"
            className={tab === 'assignments' ? 'on' : ''}
            onClick={() => handleTabSwitch('assignments')}
          >
            {t('mobile.tariffs_tab_assignments')}
            <span className="ml-1.5 rounded-full bg-[var(--bg-sunken)] px-1.5 text-[10px]">
              {assignments.length}
            </span>
          </button>
        </div>

        {tab === 'plans' && (
          <div className="flex flex-col gap-2.5">
            {activePlans.length === 0 && plans.length === 0 && (
              <div className="py-8 text-center text-[13px] text-[color:var(--text-3)]">
                {t('tariff_plans.empty_title')}
              </div>
            )}
            {plans.map((plan) => (
              <TariffPlanCard
                key={plan.id}
                plan={plan}
                onEdit={() => setEditingPlan(plan)}
                onDeactivate={plan.is_active ? () => setDeactivatingPlanId(plan.id) : undefined}
              />
            ))}
          </div>
        )}

        {tab === 'assignments' && (
          <div className="flex flex-col gap-2">
            {assignments.length === 0 && (
              <div className="py-8 text-center text-[13px] text-[color:var(--text-3)]">
                {t('tariff_assignments.empty_title')}
              </div>
            )}
            {assignments.map((a) => (
              <AssignmentCard
                key={a.id}
                assignment={a}
                childrenMap={childrenMap}
                plans={plans}
                onReplace={() => setReplaceTarget(a)}
                onClose={() => setClosingAssignmentId(a.id)}
              />
            ))}
          </div>
        )}
      </>

      <CreateTariffPlanModal open={createOpen} onOpenChange={setCreateOpen} />
      {editingPlan && (
        <EditTariffPlanModal plan={editingPlan} onClose={() => setEditingPlan(null)} />
      )}

      {deactivatingPlanId && (
        <DestructiveConfirm
          open
          onOpenChange={(v) => {
            if (!v) setDeactivatingPlanId(null);
          }}
          title={t('tariff_plans.deactivate.title')}
          description={t('tariff_plans.deactivate.description')}
          confirmLabel={t('tariff_plans.deactivate.confirm')}
          cancelLabel={t('tariff_plans.deactivate.cancel')}
          onConfirm={() => handleDeactivate(deactivatingPlanId)}
          loading={deactivateMutation.isPending}
        />
      )}

      {closingAssignmentId && (
        <DestructiveConfirm
          open
          onOpenChange={(v) => {
            if (!v) setClosingAssignmentId(null);
          }}
          title={t('tariff_assignments.close.title')}
          description={t('tariff_assignments.close.description')}
          confirmLabel={t('tariff_assignments.close.confirm')}
          cancelLabel={t('tariff_assignments.close.cancel')}
          onConfirm={() => handleCloseAssignment(closingAssignmentId)}
          loading={closeMutation.isPending}
        />
      )}

      {replaceTarget && (
        <ReplaceAssignmentModal
          assignment={replaceTarget}
          childName={childrenMap.get(replaceTarget.child_id)}
          currentPlanName={plans.find((p) => p.id === replaceTarget.tariff_plan_id)?.name}
          onClose={() => setReplaceTarget(null)}
        />
      )}
    </>
  );
}

function TariffPlanCard({
  plan,
  onEdit,
  onDeactivate,
}: {
  plan: TariffPlanResponseDto;
  onEdit: () => void;
  onDeactivate?: () => void;
}) {
  const { t } = useTranslation('billing');

  return (
    <div
      className="m-card w-full text-left"
      style={{ padding: 16, opacity: plan.is_active ? 1 : 0.7 }}
    >
      <button type="button" onClick={onEdit} className="w-full text-left">
        <div className="mb-2 flex items-start justify-between">
          <div>
            <div className="text-[15.5px] font-bold tracking-[-0.01em]">{plan.name}</div>
            <div className="mt-0.5 text-[12px] text-[color:var(--text-3)]">
              {plan.valid_from} — {plan.valid_until ?? '∞'}
            </div>
          </div>
          {plan.is_active ? (
            <Badge variant="success" dot>
              {t('mobile.tariffs_active')}
            </Badge>
          ) : (
            <Badge variant="neutral" dot>
              {t('mobile.tariffs_draft')}
            </Badge>
          )}
        </div>
        <div className="text-[24px] font-bold tracking-[-0.02em] tabular-nums text-[color:var(--primary-fg)]">
          {formatMoney(plan.amount)}
          <span className="text-[13px] font-medium text-[color:var(--text-3)]">
            {' '}
            {t('mobile.tariffs_per_month')}
          </span>
        </div>
        <div className="mt-2.5 flex items-center justify-between border-t border-[var(--line)] pt-2.5">
          <div className="text-[12px] text-[color:var(--text-3)]">
            {t('mobile.tariffs_kids_on_plan')}{' '}
            <strong className="text-[color:var(--text-1)]">0</strong>{' '}
            {t('mobile.tariffs_kids_suffix')}
          </div>
          <ChevronRightIcon className="size-4 text-[color:var(--text-4)]" />
        </div>
      </button>
      {onDeactivate && (
        <div className="mt-2.5 border-t border-[var(--line)] pt-2.5">
          <button
            type="button"
            className="m-btn ghost w-full"
            style={{ color: 'var(--danger-fg)', justifyContent: 'center' }}
            onClick={onDeactivate}
            aria-label={t('tariff_plans.deactivate.button')}
          >
            <BanIcon className="size-4" />
            {t('tariff_plans.deactivate.button')}
          </button>
        </div>
      )}
    </div>
  );
}

function AssignmentCard({
  assignment,
  childrenMap,
  plans,
  onReplace,
  onClose,
}: {
  assignment: TariffAssignmentResponseDto;
  childrenMap: Map<string, string>;
  plans: TariffPlanResponseDto[];
  onReplace: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation('billing');
  const childName = childrenMap.get(assignment.child_id) ?? assignment.child_id.slice(0, 8);
  const plan = plans.find((p) => p.id === assignment.tariff_plan_id);
  const planName = plan?.name ?? assignment.tariff_plan_id.slice(0, 8);
  const amount = assignment.custom_amount ?? plan?.amount ?? 0;

  return (
    <div className="m-card" style={{ padding: 14 }}>
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold text-[color:var(--text-1)]">{childName}</div>
          <div className="mt-0.5 text-[12px] text-[color:var(--text-3)]">{planName}</div>
        </div>
        <div className="text-right">
          <div className="text-[15px] font-bold tabular-nums">{formatMoney(amount)}</div>
          <div className="text-[11px] text-[color:var(--text-3)]">
            {assignment.valid_from} → {assignment.valid_until ?? '∞'}
          </div>
        </div>
      </div>
      <div className="mt-2.5 flex justify-end gap-2 border-t border-[var(--line)] pt-2.5">
        <button
          type="button"
          className="m-btn ghost"
          style={{ fontSize: 12, padding: '4px 10px' }}
          onClick={onReplace}
          aria-label={t('tariff_assignments.replace.button')}
        >
          <RefreshCwIcon className="size-3.5" />
          {t('tariff_assignments.replace.button')}
        </button>
        <button
          type="button"
          className="m-btn ghost"
          style={{ color: 'var(--danger-fg)', fontSize: 12, padding: '4px 10px' }}
          onClick={onClose}
          aria-label={t('tariff_assignments.close.button')}
        >
          <XCircleIcon className="size-3.5" />
          {t('tariff_assignments.close.button')}
        </button>
      </div>
    </div>
  );
}
