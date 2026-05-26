import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, useWatch, Controller, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { type ColumnDef } from '@tanstack/react-table';
import {
  PlusIcon,
  MoreHorizontalIcon,
  CheckIcon,
  XIcon,
  PlayIcon,
  AlertTriangleIcon,
  FilterIcon,
} from 'lucide-react';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import MobileTopBar from '@/components/layout/mobile-top-bar';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataTable } from '@/components/data-table/data-table';
import { DestructiveConfirm } from '@/components/feedback/destructive-confirm';
import { EntityCombobox } from '@/components/forms/entity-combobox';
import type { ComboboxOption } from '@/components/forms/entity-combobox';
import { mapValidationErrors } from '@/components/forms/map-validation-errors';
import {
  useRefundsList,
  useCreateRefund,
  useApproveRefund,
  useRejectRefund,
  useProcessRefund,
  type RefundResponseDto,
  type RefundStatus,
} from '@/hooks/use-refunds';
import { usePaymentsList } from '@/hooks/use-payments';
import { useChildrenList } from '@/hooks/use-children';
import { formatMoney, formatDateTime } from '@/lib/format';
import { toI18nKey } from '@/lib/error-map';
import { DEFAULT_TIMEZONE } from '@/lib/constants';

type BadgeVariant = 'neutral' | 'warning' | 'success' | 'error' | 'info';

const REFUND_STATUS_BADGE: Record<RefundStatus, BadgeVariant> = {
  pending: 'warning',
  approved: 'info',
  processed: 'success',
  rejected: 'error',
};

const REFUND_STATUSES: RefundStatus[] = ['pending', 'approved', 'processed', 'rejected'];

const PRO_RATA_REASON = 'pro_rata_archive';

const CreateRefundSchema = z.object({
  payment_id: z.string().min(1),
  amount: z.coerce.number().min(1),
  reason: z.string().min(1).max(500),
});

type CreateRefundForm = z.infer<typeof CreateRefundSchema>;

const EMPTY_DATA: RefundResponseDto[] = [];

export default function RefundsListPage() {
  const { t } = useTranslation('billing');
  const tz = DEFAULT_TIMEZONE;
  const { isMobile } = useBreakpoint();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [approveTarget, setApproveTarget] = useState<string | null>(null);
  const [processTarget, setProcessTarget] = useState<string | null>(null);

  const filters = useMemo(
    () => ({
      status: statusFilter !== 'all' ? (statusFilter as RefundStatus) : undefined,
    }),
    [statusFilter],
  );

  const refundsQuery = useRefundsList(filters);
  const data = refundsQuery.data ?? EMPTY_DATA;

  const childrenQuery = useChildrenList({ limit: 200, offset: 0 });
  const childrenMap = useMemo(
    () => new Map((childrenQuery.data?.data ?? []).map((c) => [c.id, c.full_name])),
    [childrenQuery.data],
  );

  const paymentsQuery = usePaymentsList({ limit: 200 });
  const paymentsMap = useMemo(
    () => new Map((paymentsQuery.data ?? []).map((p) => [p.id, p])),
    [paymentsQuery.data],
  );

  const pendingProRata = useMemo(
    () => data.filter((r) => r.status === 'pending' && r.reason === PRO_RATA_REASON),
    [data],
  );

  const pendingCount = useMemo(() => data.filter((r) => r.status === 'pending').length, [data]);

  const isFiltered = statusFilter !== 'all';
  const resetFilters = useCallback(() => setStatusFilter('all'), []);

  const approveMutation = useApproveRefund();
  const rejectMutation = useRejectRefund();
  const processMutation = useProcessRefund();

  function handleApprove() {
    if (!approveTarget) return;
    approveMutation.mutate(approveTarget, {
      onSuccess: () => {
        toast.success(t('refunds.approve_confirm.success'));
        setApproveTarget(null);
      },
      onError: (err) => {
        toast.error(t(toI18nKey(err), { defaultValue: t('errors:unknown_error') }));
        console.error(err);
      },
    });
  }

  function handleReject(reason?: string) {
    if (!rejectTarget || !reason) return;
    rejectMutation.mutate(
      { id: rejectTarget, body: { reason } },
      {
        onSuccess: () => {
          toast.success(t('refunds.reject_confirm.success'));
          setRejectTarget(null);
        },
        onError: (err) => {
          toast.error(t(toI18nKey(err), { defaultValue: t('errors:unknown_error') }));
          console.error(err);
        },
      },
    );
  }

  function handleProcess() {
    if (!processTarget) return;
    processMutation.mutate(processTarget, {
      onSuccess: () => {
        toast.success(t('refunds.process_confirm.success'));
        setProcessTarget(null);
      },
      onError: (err) => {
        toast.error(t(toI18nKey(err), { defaultValue: t('errors:unknown_error') }));
        console.error(err);
      },
    });
  }

  const [mobileTab, setMobileTab] = useState<'pending' | 'approved' | 'processed' | 'history'>(
    'pending',
  );

  const columns: ColumnDef<RefundResponseDto, unknown>[] = useMemo(
    () => [
      {
        id: 'child',
        header: () => t('refunds.columns.child'),
        cell: ({ row }) => {
          const payment = paymentsMap.get(row.original.payment_id);
          const childName = payment
            ? (childrenMap.get(payment.child_id) ?? payment.child_id.slice(0, 8))
            : '—';
          return <span className="font-semibold text-[color:var(--text-1)]">{childName}</span>;
        },
      },
      {
        id: 'payment',
        header: () => t('refunds.columns.payment'),
        cell: ({ row }) => (
          <span className="font-mono text-[12px] text-[color:var(--text-3)]">
            {row.original.payment_id.slice(0, 8)}
          </span>
        ),
      },
      {
        id: 'amount',
        header: () => t('refunds.columns.amount'),
        cell: ({ row }) => (
          <strong className="text-[color:var(--text-1)]">{formatMoney(row.original.amount)}</strong>
        ),
        meta: { className: 'text-right' },
      },
      {
        id: 'reason',
        header: () => t('refunds.columns.reason'),
        cell: ({ row }) => (
          <div>
            <span>{row.original.reason}</span>
            {row.original.reason === PRO_RATA_REASON && (
              <div className="text-[12px] text-[color:var(--text-3)]">
                {t('refunds.pro_rata_reason')}
              </div>
            )}
          </div>
        ),
      },
      {
        id: 'status',
        header: () => t('refunds.columns.status'),
        cell: ({ row }) => (
          <Badge variant={REFUND_STATUS_BADGE[row.original.status]} dot>
            {t(`refunds.status.${row.original.status}`)}
          </Badge>
        ),
      },
      {
        id: 'date',
        header: () => t('refunds.columns.date'),
        cell: ({ row }) => formatDateTime(row.original.created_at, tz),
      },
      {
        id: 'actions',
        header: () => t('refunds.columns.actions'),
        cell: ({ row }) => {
          const r = row.original;
          if (r.status === 'pending') {
            return (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setRejectTarget(r.id);
                  }}
                >
                  <XIcon className="size-3.5" />
                  {t('refunds.actions.reject')}
                </Button>
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setApproveTarget(r.id);
                  }}
                >
                  <CheckIcon className="size-3.5" />
                  {t('refunds.actions.approve')}
                </Button>
              </div>
            );
          }
          if (r.status === 'approved') {
            return (
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setProcessTarget(r.id);
                }}
              >
                <PlayIcon className="size-3.5" />
                {t('refunds.actions.process')}
              </Button>
            );
          }
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                  <MoreHorizontalIcon className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled>{t('refunds.actions.details')}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [t, tz, paymentsMap, childrenMap],
  );

  if (isMobile) {
    const filteredItems = data.filter((r) => {
      if (mobileTab === 'pending') return r.status === 'pending';
      if (mobileTab === 'approved') return r.status === 'approved';
      return r.status === 'processed' || r.status === 'rejected';
    });

    return (
      <div className="m-shell">
        <MobileTopBar
          title={t('refunds.title')}
          sub={t('mobile.refunds_sub', { count: pendingCount })}
          action={
            <button type="button" className="m-iconbtn" aria-label="Filter">
              <FilterIcon className="size-5" />
            </button>
          }
        />
        <div className="m-scroll">
          <div
            style={{
              padding: 14,
              background: 'var(--warning-soft)',
              borderRadius: 14,
              color: 'var(--warning-fg)',
              fontSize: '12.5px',
              display: 'flex',
              gap: 10,
              marginBottom: 14,
            }}
          >
            <AlertTriangleIcon style={{ width: 16, height: 16, flexShrink: 0, marginTop: 1 }} />
            <div>{t('mobile.refunds_phase_a_banner')}</div>
          </div>

          <div className="m-segmented" style={{ marginBottom: 12 }}>
            <button
              type="button"
              className={mobileTab === 'pending' ? 'on' : ''}
              onClick={() => setMobileTab('pending')}
            >
              {t('mobile.refunds_tab_pending')}
              {pendingCount > 0 && (
                <span
                  style={{
                    marginLeft: 5,
                    background: 'var(--warning)',
                    color: 'white',
                    fontSize: 10,
                    padding: '1px 6px',
                    borderRadius: 999,
                    fontWeight: 700,
                  }}
                >
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              type="button"
              className={mobileTab === 'approved' ? 'on' : ''}
              onClick={() => setMobileTab('approved')}
            >
              {t('mobile.refunds_tab_in_progress')}
            </button>
            <button
              type="button"
              className={mobileTab === 'history' ? 'on' : ''}
              onClick={() => setMobileTab('history')}
            >
              {t('mobile.refunds_tab_history')}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredItems.length === 0 && (
              <div className="py-8 text-center text-[13px] text-[color:var(--text-3)]">
                {t('refunds.empty_title')}
              </div>
            )}
            {filteredItems.map((r) => {
              const payment = paymentsMap.get(r.payment_id);
              const childName = payment
                ? (childrenMap.get(payment.child_id) ?? payment.child_id.slice(0, 8))
                : '—';
              return (
                <div key={r.id} className="m-card" style={{ padding: 14 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: 'JetBrains Mono, monospace',
                          fontSize: 11,
                          color: 'var(--text-4)',
                        }}
                      >
                        {r.id.slice(0, 8)}
                      </div>
                      <div style={{ fontWeight: 600, fontSize: 14, marginTop: 2 }}>{childName}</div>
                    </div>
                    <div
                      style={{ fontSize: 16, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
                    >
                      {formatMoney(r.amount)}
                    </div>
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-2)', marginBottom: 8 }}>
                    {r.reason}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                      {formatDateTime(r.created_at, tz)}
                    </span>
                    <Badge variant={REFUND_STATUS_BADGE[r.status]} dot>
                      {t(`refunds.status.${r.status}`)}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const toolbar = (
    <>
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('refunds.filters.all_statuses')}</SelectItem>
          {REFUND_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {t(`refunds.status.${s}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex-1" />
    </>
  );

  return (
    <div className="flex flex-col gap-[14px]">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold leading-tight text-[color:var(--text-1)]">
            {t('refunds.title')}
          </h1>
          {pendingCount > 0 && (
            <div className="mt-0.5 text-[13px] text-[color:var(--text-3)]">
              {t('refunds.subtitle_pending', { count: pendingCount })}
            </div>
          )}
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <PlusIcon className="size-4" />
          {t('refunds.create_button')}
        </Button>
      </div>

      {pendingProRata.length > 0 && (
        <div className="flex gap-3 rounded-[var(--r-lg)] border border-[var(--warning-soft-border)] bg-[var(--warning-soft)] p-4">
          <div>
            <div className="text-[13px] font-semibold text-[color:var(--warning-text)]">
              {t('refunds.pro_rata_banner_title', { count: pendingProRata.length })}
            </div>
            <div className="mt-1 text-[12px] text-[color:var(--warning-text)]">
              {t('refunds.pro_rata_banner_text')}
            </div>
          </div>
        </div>
      )}

      <DataTable<RefundResponseDto>
        columns={columns}
        data={data}
        isLoading={refundsQuery.isPending}
        isError={refundsQuery.isError}
        onRetry={() => void refundsQuery.refetch()}
        isFiltered={isFiltered}
        onResetFilters={resetFilters}
        emptyTitle={t('refunds.empty_title')}
        emptyDescription={t('refunds.empty_description')}
        emptyAction={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <PlusIcon className="size-4" />
            {t('refunds.create_button')}
          </Button>
        }
        filteredEmptyTitle={t('refunds.filtered_empty_title')}
        filteredEmptyDescription={t('refunds.filtered_empty_description')}
        toolbar={toolbar}
      />

      <CreateRefundModal open={createOpen} onOpenChange={setCreateOpen} />

      {/* Approve confirm */}
      <DestructiveConfirm
        open={!!approveTarget}
        onOpenChange={(v) => {
          if (!v) setApproveTarget(null);
        }}
        title={t('refunds.approve_confirm.title')}
        description={t('refunds.approve_confirm.description')}
        confirmLabel={t('refunds.actions.approve')}
        onConfirm={handleApprove}
        loading={approveMutation.isPending}
      />

      {/* Reject confirm with reason */}
      <DestructiveConfirm
        open={!!rejectTarget}
        onOpenChange={(v) => {
          if (!v) setRejectTarget(null);
        }}
        title={t('refunds.reject_confirm.title')}
        description={t('refunds.reject_confirm.description')}
        confirmLabel={t('refunds.actions.reject')}
        requireReason
        minLen={1}
        maxLen={500}
        onConfirm={handleReject}
        loading={rejectMutation.isPending}
      />

      {/* Process confirm */}
      <DestructiveConfirm
        open={!!processTarget}
        onOpenChange={(v) => {
          if (!v) setProcessTarget(null);
        }}
        title={t('refunds.process_confirm.title')}
        description={t('refunds.process_confirm.description')}
        confirmLabel={t('refunds.actions.process')}
        onConfirm={handleProcess}
        loading={processMutation.isPending}
      />
    </div>
  );
}

function CreateRefundModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation('billing');
  const createMutation = useCreateRefund();

  const paymentsQuery = usePaymentsList({ status: 'completed', limit: 200 });

  const form = useForm<CreateRefundForm>({
    resolver: zodResolver(CreateRefundSchema) as Resolver<CreateRefundForm>,
    defaultValues: {
      payment_id: '',
      amount: 0,
      reason: '',
    },
  });

  const selectedPaymentId = useWatch({ control: form.control, name: 'payment_id' });
  const selectedPayment = (paymentsQuery.data ?? []).find((p) => p.id === selectedPaymentId);

  async function fetchPaymentOptions(query: string): Promise<ComboboxOption[]> {
    const payments = paymentsQuery.data ?? [];
    const lowerQ = query.toLowerCase();
    return payments
      .filter(
        (p) =>
          !lowerQ ||
          p.id.toLowerCase().includes(lowerQ) ||
          p.invoice_id.toLowerCase().includes(lowerQ),
      )
      .slice(0, 30)
      .map((p) => ({
        value: p.id,
        label: `${p.id.slice(0, 8)} — ${formatMoney(p.amount)}`,
      }));
  }

  function handleClose() {
    onOpenChange(false);
    form.reset();
  }

  function onSubmit(data: CreateRefundForm) {
    createMutation.mutate(
      {
        payment_id: data.payment_id,
        amount: data.amount,
        reason: data.reason,
      },
      {
        onSuccess: () => {
          toast.success(t('refunds.create.success'));
          handleClose();
        },
        onError: (err) => {
          const mapped = mapValidationErrors(err, form.setError);
          if (!mapped) {
            toast.error(t(toI18nKey(err), { defaultValue: t('errors:unknown_error') }));
          }
          console.error(err);
        },
      },
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose();
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[500px] rounded-[var(--r-xl)] border-[var(--line)] bg-[var(--bg-elev)] p-0 shadow-[var(--shadow-3)]">
        <DialogHeader className="px-[22px] pt-[18px] pb-3">
          <DialogTitle className="text-[17px] font-bold tracking-[-0.01em] text-[color:var(--text-1)]">
            {t('refunds.create.title')}
          </DialogTitle>
          <DialogDescription className="text-[13px] text-[color:var(--text-3)]">
            {t('refunds.title')}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4 px-[22px] pb-[18px]"
        >
          <div className="flex flex-col gap-1.5">
            <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
              {t('refunds.create.payment_id')}
              <span className="text-[color:var(--danger)]"> *</span>
            </Label>
            <Controller
              control={form.control}
              name="payment_id"
              render={({ field, fieldState }) => (
                <>
                  <EntityCombobox
                    value={field.value || null}
                    onChange={(val) => field.onChange(val ?? '')}
                    fetchOptions={fetchPaymentOptions}
                    placeholder={t('refunds.create.payment_id_placeholder')}
                  />
                  {fieldState.error && (
                    <p className="text-[12px] text-[color:var(--danger-fg)]">
                      {fieldState.error.message}
                    </p>
                  )}
                </>
              )}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
              {t('refunds.create.amount')}
              <span className="text-[color:var(--danger)]"> *</span>
            </Label>
            <Input
              type="number"
              {...form.register('amount', { valueAsNumber: true })}
              placeholder={t('refunds.create.amount_placeholder')}
            />
            {selectedPayment && (
              <p className="text-[12px] text-[color:var(--text-3)]">
                {t('refunds.create.amount_hint')} ({formatMoney(selectedPayment.amount)})
              </p>
            )}
            {form.formState.errors.amount && (
              <p className="text-[12px] text-[color:var(--danger-fg)]">
                {form.formState.errors.amount.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
              {t('refunds.create.reason')}
              <span className="text-[color:var(--danger)]"> *</span>
            </Label>
            <Input
              {...form.register('reason')}
              placeholder={t('refunds.create.reason_placeholder')}
            />
            {form.formState.errors.reason && (
              <p className="text-[12px] text-[color:var(--danger-fg)]">
                {form.formState.errors.reason.message}
              </p>
            )}
          </div>

          {form.formState.errors.root && (
            <p className="text-[13px] text-[color:var(--danger-fg)]">
              {form.formState.errors.root.message}
            </p>
          )}

          <DialogFooter className="-mx-0 -mb-0 rounded-b-[var(--r-xl)] border-t border-[var(--line)] bg-transparent px-[22px] py-[14px]">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="border-[var(--border)] bg-[var(--bg-elev)] text-[color:var(--text-1)] hover:bg-[var(--bg-sunken)]"
            >
              {t('refunds.create.cancel')}
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {t('refunds.create.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
