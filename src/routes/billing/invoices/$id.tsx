import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  ChevronRightIcon,
  CheckCircleIcon,
  InfoIcon,
  CreditCardIcon,
  GiftIcon,
  DownloadIcon,
  MailIcon,
  ReceiptIcon,
  MoreHorizontalIcon,
} from 'lucide-react';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import MobileTopBar from '@/components/layout/mobile-top-bar';
import { StickyBottomBar } from '@/components/layout/sticky-bottom-bar';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DestructiveConfirm } from '@/components/feedback/destructive-confirm';
import { ErrorState } from '@/components/feedback/error-state';
import { EmptyState } from '@/components/feedback/empty-state';
import { SkeletonLine, SkeletonBox } from '@/components/feedback/skeleton';
import {
  useInvoice,
  useMarkInvoicePaid,
  useCancelInvoice,
  type InvoiceStatus,
} from '@/hooks/use-invoices';
import { useChildrenList } from '@/hooks/use-children';
import { formatMoney, formatDate, getInitials } from '@/lib/format';
import { toI18nKey, isAppError } from '@/lib/error-map';
import { DEFAULT_TIMEZONE } from '@/lib/constants';
import { INVOICE_STATUS_BADGE } from './invoice-constants';

const CANCELLABLE_STATUSES: InvoiceStatus[] = ['pending', 'partial'];
const MARKABLE_STATUSES: InvoiceStatus[] = ['pending', 'partial', 'overdue'];

const MarkPaidSchema = z.object({
  paid_at: z.string().default(''),
  note: z.string().default(''),
});

type MarkPaidForm = z.infer<typeof MarkPaidSchema>;

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation('billing');
  const tz = DEFAULT_TIMEZONE;
  const { isMobile } = useBreakpoint();

  const invoiceQuery = useInvoice(id ?? '');
  const invoice = invoiceQuery.data;

  const childrenQuery = useChildrenList({ status: 'active', limit: 200, offset: 0 });
  const childName =
    childrenQuery.data?.data.find((c) => c.id === invoice?.child_id)?.full_name ?? null;

  const [markPaidOpen, setMarkPaidOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const markPaidMutation = useMarkInvoicePaid(id ?? '');
  const cancelMutation = useCancelInvoice(id ?? '');

  const markPaidForm = useForm<MarkPaidForm>({
    resolver: zodResolver(MarkPaidSchema) as Resolver<MarkPaidForm>,
    defaultValues: { paid_at: '', note: '' },
  });

  function handleMarkPaid(data: MarkPaidForm) {
    markPaidMutation.mutate(
      {
        paid_at: data.paid_at || null,
        note: data.note || null,
      },
      {
        onSuccess: () => {
          setMarkPaidOpen(false);
          markPaidForm.reset();
          toast.success(t('invoices.mark_paid.success'));
        },
        onError: (err) => {
          if (isAppError(err) && err.code === 'invoice_already_paid') {
            toast.error(t('errors:invoice_already_paid'));
            void invoiceQuery.refetch();
          } else {
            toast.error(t(toI18nKey(err), { defaultValue: t('errors:unknown_error') }));
          }
          console.error(err);
        },
      },
    );
  }

  function handleCancel(reason?: string) {
    cancelMutation.mutate(
      { reason: reason || null },
      {
        onSuccess: () => {
          setCancelOpen(false);
          toast.success(t('invoices.cancel_invoice.success'));
        },
        onError: (err) => {
          if (isAppError(err) && err.code === 'invoice_status_invalid') {
            toast.error(t('errors:invoice_status_invalid'));
            void invoiceQuery.refetch();
          } else {
            toast.error(t(toI18nKey(err), { defaultValue: t('errors:unknown_error') }));
          }
          console.error(err);
        },
      },
    );
  }

  if (invoiceQuery.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <SkeletonLine width={200} height={14} />
        <SkeletonBox height={120} />
        <SkeletonBox height={300} />
      </div>
    );
  }

  if (invoiceQuery.isError || !invoice) {
    return (
      <ErrorState title={t('invoices.detail.not_found')} onRetry={() => invoiceQuery.refetch()} />
    );
  }

  const isCancellable = CANCELLABLE_STATUSES.includes(invoice.status);
  const isMarkable = MARKABLE_STATUSES.includes(invoice.status);
  const hasDiscount =
    invoice.discount_pct !== null &&
    invoice.discount_pct > 0 &&
    invoice.amount_due !== invoice.amount_after_discount;
  const lineItems = invoice.line_items ?? [];

  const statusTone: Record<string, string> = {
    paid: 'success',
    overdue: 'danger',
    partial: 'warning',
    pending: 'neutral',
    refunded: 'info',
    cancelled: 'neutral',
  };
  const tone = statusTone[invoice.status] ?? 'neutral';

  if (isMobile) {
    return (
      <>
        <MobileTopBar
          title={invoice.id.slice(0, 8)}
          sub={t(`invoices.type.${invoice.invoice_type}`)}
          back
          action={
            <button type="button" className="m-iconbtn ghost">
              <MoreHorizontalIcon className="size-5" />
            </button>
          }
        />
        <div style={{ paddingBottom: 60 }}>
          <div
            className="m-card"
            style={{
              padding: 18,
              marginBottom: 14,
              textAlign: 'center',
              background: `linear-gradient(180deg, var(--${tone}-soft), var(--bg-elev))`,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: `var(--${tone}-fg)`,
              }}
            >
              {t(`invoices.status.${invoice.status}`)}
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em', marginTop: 4 }}>
              {formatMoney(invoice.amount_after_discount)}
            </div>
            {invoice.status === 'paid' && (
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
                {t('mobile.invoice_detail_paid_at', {
                  date: formatDate(invoice.updated_at, tz),
                })}
              </div>
            )}
          </div>

          <div className="m-card flush" style={{ marginBottom: 14 }}>
            <div className="m-kv">
              <span className="k">{t('mobile.invoice_detail_period')}</span>
              <span className="v">
                {formatDate(invoice.period_start, tz)} – {formatDate(invoice.period_end, tz)}
              </span>
            </div>
            <div className="m-kv">
              <span className="k">{t('mobile.invoice_detail_due_date')}</span>
              <span className="v">{formatDate(invoice.due_date, tz)}</span>
            </div>
            <div className="m-kv">
              <span className="k">{t('invoices.detail.child_label')}</span>
              <span className="v">{childName ?? invoice.child_id.slice(0, 8)}</span>
            </div>
          </div>

          <div className="m-section-h">
            <div className="m-section-title">{t('mobile.invoice_detail_calculation')}</div>
          </div>
          <div className="m-card flush">
            {lineItems.map((li) => (
              <div key={li.id} className="m-kv">
                <span className="k">{li.description}</span>
                <span className="v">{formatMoney(li.line_total)}</span>
              </div>
            ))}
            {hasDiscount && (
              <div className="m-kv">
                <span className="k" style={{ color: 'var(--success-fg)' }}>
                  {invoice.discount_reason ?? t('invoices.detail.discount_label')} −
                  {invoice.discount_pct}%
                </span>
                <span className="v" style={{ color: 'var(--success-fg)' }}>
                  −{formatMoney(invoice.amount_due - invoice.amount_after_discount)}
                </span>
              </div>
            )}
            <div className="m-kv" style={{ background: 'var(--bg-subtle)' }}>
              <span className="k" style={{ fontWeight: 700, color: 'var(--text-1)' }}>
                {t('mobile.invoice_detail_total')}
              </span>
              <span className="v" style={{ fontSize: 18, fontWeight: 700 }}>
                {formatMoney(invoice.amount_after_discount)}
              </span>
            </div>
          </div>

          <div className="m-section-h">
            <div className="m-section-title">{t('mobile.invoice_detail_payments')}</div>
          </div>
          <div className="m-card flush">
            <div className="px-4 py-6 text-center text-[12px] text-[color:var(--text-3)]">
              {t('invoices.detail.payments_unavailable_hint')}
            </div>
          </div>

          <div className="m-section-h">
            <div className="m-section-title">{t('mobile.invoice_detail_fiscal')}</div>
          </div>
          <div
            className="m-card"
            style={{ padding: 14, display: 'flex', gap: 12, alignItems: 'center' }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'var(--bg-sunken)',
                color: 'var(--text-3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ReceiptIcon className="size-[18px]" />
            </div>
            <div style={{ flex: 1, fontSize: 12, color: 'var(--text-3)' }}>
              {t('invoices.detail.fiscal_unavailable')}
            </div>
          </div>
        </div>

        <StickyBottomBar>
          <button type="button" className="m-btn" style={{ flex: 1 }}>
            <DownloadIcon className="size-4" />
            {t('mobile.invoice_detail_pdf')}
          </button>
          <button type="button" className="m-btn primary" style={{ flex: 1 }}>
            <MailIcon className="size-4" />
            {t('mobile.invoice_detail_send')}
          </button>
        </StickyBottomBar>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-[14px]">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[12px] text-[color:var(--text-3)]">
        <Link to="/billing/invoices" className="hover:text-[color:var(--primary)]">
          {t('invoices.detail.breadcrumb')}
        </Link>
        <ChevronRightIcon className="size-3 text-[color:var(--text-4)]" />
        <span className="text-[color:var(--text-1)]">{invoice.id.slice(0, 8)}</span>
      </div>

      {/* Header card */}
      <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] shadow-[var(--shyraq-shadow-1)]">
        <div className="flex gap-5 p-5">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-[22px] font-bold leading-tight text-[color:var(--text-1)]">
                {t('invoices.detail.invoice_number', { id: invoice.id.slice(0, 8) })}
              </h1>
              <Badge variant={INVOICE_STATUS_BADGE[invoice.status]} dot>
                {t(`invoices.status.${invoice.status}`)}
              </Badge>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[12px] text-[color:var(--text-3)]">
              <span>{t(`invoices.type.${invoice.invoice_type}`)}</span>
              <span className="size-1 rounded-full bg-[var(--text-4)]" />
              <span>
                {t('invoices.detail.period_label')}:{' '}
                <strong className="text-[color:var(--text-2)]">
                  {formatDate(invoice.period_start, tz)} – {formatDate(invoice.period_end, tz)}
                </strong>
              </span>
              <span className="size-1 rounded-full bg-[var(--text-4)]" />
              <span>
                {t('invoices.detail.due_date_label')}:{' '}
                <strong
                  className={
                    invoice.status === 'overdue'
                      ? 'text-[color:var(--danger-fg)]'
                      : 'text-[color:var(--text-2)]'
                  }
                >
                  {formatDate(invoice.due_date, tz)}
                </strong>
              </span>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[12px] text-[color:var(--text-3)]">
              {t('invoices.detail.amount_after_discount_label')}
            </div>
            <div className="text-[32px] font-bold leading-tight tracking-[-0.02em] text-[color:var(--text-1)]">
              {formatMoney(invoice.amount_after_discount)}
            </div>
            {hasDiscount && (
              <div className="text-[12px] text-[color:var(--success-fg)]">
                {t('invoices.detail.discount_label')} &minus;
                {formatMoney(invoice.amount_due - invoice.amount_after_discount)}{' '}
                {t('invoices.detail.amount_due_label').toLowerCase()}{' '}
                {formatMoney(invoice.amount_due)}
              </div>
            )}
          </div>
        </div>

        {(isCancellable || isMarkable) && (
          <div className="flex justify-end gap-2 border-t border-[var(--line)] px-5 py-3">
            {isCancellable && (
              <Button variant="destructive" onClick={() => setCancelOpen(true)}>
                {t('invoices.detail.actions.cancel')}
              </Button>
            )}
            {isMarkable && (
              <Button onClick={() => setMarkPaidOpen(true)}>
                <CheckCircleIcon className="size-4" />
                {t('invoices.detail.actions.mark_paid')}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-[1fr_320px] gap-4">
        {/* Left: main sections */}
        <div className="flex flex-col gap-4">
          {/* Line items */}
          <div className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)]">
            <div className="border-b border-[var(--line)] px-5 py-3">
              <h3 className="text-[15px] font-bold text-[color:var(--text-1)]">
                {t('invoices.detail.line_items.title')}
              </h3>
            </div>
            {lineItems.length === 0 ? (
              <div className="px-5 py-8 text-center text-[13px] text-[color:var(--text-3)]">
                {t('invoices.detail.line_items.empty')}
              </div>
            ) : (
              <table className="w-full border-collapse text-[13.5px]">
                <thead>
                  <tr>
                    <th className="border-b border-[var(--line)] bg-[var(--bg-subtle)] px-3.5 py-2.5 text-left text-xs font-semibold uppercase tracking-[0.04em] text-[color:var(--text-3)]">
                      {t('invoices.detail.line_items.description')}
                    </th>
                    <th className="border-b border-[var(--line)] bg-[var(--bg-subtle)] px-3.5 py-2.5 text-right text-xs font-semibold uppercase tracking-[0.04em] text-[color:var(--text-3)]">
                      {t('invoices.detail.line_items.quantity')}
                    </th>
                    <th className="border-b border-[var(--line)] bg-[var(--bg-subtle)] px-3.5 py-2.5 text-right text-xs font-semibold uppercase tracking-[0.04em] text-[color:var(--text-3)]">
                      {t('invoices.detail.line_items.unit_price')}
                    </th>
                    <th className="border-b border-[var(--line)] bg-[var(--bg-subtle)] px-3.5 py-2.5 text-right text-xs font-semibold uppercase tracking-[0.04em] text-[color:var(--text-3)]">
                      {t('invoices.detail.line_items.line_total')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((li) => (
                    <tr key={li.id} className="border-b border-[var(--line)] last:border-b-0">
                      <td className="px-3.5 py-3 text-[color:var(--text-1)]">
                        <strong>{li.description}</strong>
                      </td>
                      <td className="px-3.5 py-3 text-right text-[color:var(--text-1)]">
                        {li.quantity}
                      </td>
                      <td className="px-3.5 py-3 text-right text-[color:var(--text-1)]">
                        {formatMoney(li.unit_price)}
                      </td>
                      <td className="px-3.5 py-3 text-right font-semibold text-[color:var(--text-1)]">
                        {formatMoney(li.line_total)}
                      </td>
                    </tr>
                  ))}
                  {hasDiscount && (
                    <tr className="border-b border-[var(--line)]">
                      <td className="px-3.5 py-3 text-[color:var(--text-1)]">
                        {t('invoices.detail.discount_label')}: {invoice.discount_reason ?? ''}
                      </td>
                      <td className="px-3.5 py-3 text-right text-[color:var(--text-3)]">&mdash;</td>
                      <td className="px-3.5 py-3 text-right text-[color:var(--success-fg)]">
                        &minus;{invoice.discount_pct}%
                      </td>
                      <td className="px-3.5 py-3 text-right text-[color:var(--success-fg)]">
                        &minus;{formatMoney(invoice.amount_due - invoice.amount_after_discount)}
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td
                      colSpan={3}
                      className="px-3.5 py-3 text-right text-[14px] font-bold text-[color:var(--text-1)]"
                    >
                      {t('invoices.detail.amount_after_discount_label')}
                    </td>
                    <td className="px-3.5 py-3 text-right text-[16px] font-bold text-[color:var(--text-1)]">
                      {formatMoney(invoice.amount_after_discount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          {/* Related payments (degraded) */}
          <div className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)]">
            <div className="border-b border-[var(--line)] px-5 py-3">
              <h3 className="text-[15px] font-bold text-[color:var(--text-1)]">
                {t('invoices.detail.related_payments')}
              </h3>
            </div>
            <EmptyState
              icon={<CreditCardIcon className="size-9 text-[color:var(--text-4)]" />}
              title={t('invoices.detail.payments_unavailable')}
              text={t('invoices.detail.payments_unavailable_hint')}
            />
          </div>

          {/* Discounts section */}
          {hasDiscount && (
            <div className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)]">
              <div className="border-b border-[var(--line)] px-5 py-3">
                <h3 className="text-[15px] font-bold text-[color:var(--text-1)]">
                  {t('invoices.detail.discount_label')}
                </h3>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-3 rounded-[var(--r-md)] bg-[var(--success-soft)] p-3">
                  <GiftIcon className="size-5 text-[color:var(--success-fg)]" />
                  <div className="flex-1">
                    <strong>
                      {invoice.discount_reason ?? t('invoices.detail.discount_label')}
                    </strong>
                    <div className="text-[12px] text-[color:var(--text-3)]">
                      &minus;{invoice.discount_pct}%
                    </div>
                  </div>
                  <strong className="text-[color:var(--success-fg)]">
                    &minus;{formatMoney(invoice.amount_due - invoice.amount_after_discount)}
                  </strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="flex flex-col gap-4">
          {/* Child card */}
          <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-4">
            <h3 className="mb-2 text-[15px] font-bold text-[color:var(--text-1)]">
              {t('invoices.detail.child_label')}
            </h3>
            <Link
              to={`/children/${invoice.child_id}`}
              className="flex items-center gap-3 rounded-[var(--r-md)] p-2 transition-colors hover:bg-[var(--bg-sunken)]"
            >
              <Avatar className="size-10">
                <AvatarFallback className="bg-[var(--primary-soft)] text-sm font-bold text-[color:var(--primary)]">
                  {getInitials(childName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="text-[13.5px] font-semibold text-[color:var(--text-1)]">
                  {childName ?? invoice.child_id.slice(0, 8)}
                </div>
              </div>
              <ChevronRightIcon className="size-3.5 text-[color:var(--text-4)]" />
            </Link>
          </div>

          {/* Fiscal receipt (degraded) */}
          <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-4">
            <h3 className="mb-3 text-[15px] font-bold text-[color:var(--text-1)]">
              {t('invoices.detail.fiscal_receipt')}
            </h3>
            <div className="flex items-start gap-2 rounded-[var(--r-md)] bg-[var(--bg-sunken)] p-3">
              <InfoIcon className="mt-0.5 size-4 shrink-0 text-[color:var(--text-3)]" />
              <div className="text-[12.5px] text-[color:var(--text-3)]">
                {t('invoices.detail.fiscal_unavailable')}
              </div>
            </div>
          </div>

          {/* Meta info */}
          <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-4">
            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[12.5px]">
              <span className="text-[color:var(--text-3)]">
                {t('invoices.detail.created_at_label')}
              </span>
              <span className="text-[color:var(--text-1)]">
                {formatDate(invoice.created_at, tz)}
              </span>
              <span className="text-[color:var(--text-3)]">
                {t('invoices.detail.updated_at_label')}
              </span>
              <span className="text-[color:var(--text-1)]">
                {formatDate(invoice.updated_at, tz)}
              </span>
              {invoice.description && (
                <>
                  <span className="text-[color:var(--text-3)]">
                    {t('invoices.detail.description_label')}
                  </span>
                  <span className="text-[color:var(--text-1)]">{invoice.description}</span>
                </>
              )}
              {invoice.prorated_for_days !== null && (
                <>
                  <span className="text-[color:var(--text-3)]">
                    {t('invoices.detail.prorated_label')}
                  </span>
                  <span className="text-[color:var(--text-1)]">{invoice.prorated_for_days}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mark paid modal */}
      <Dialog open={markPaidOpen} onOpenChange={setMarkPaidOpen}>
        <DialogContent className="sm:max-w-[440px] rounded-[var(--r-xl)] border-[var(--line)] bg-[var(--bg-elev)] p-0 shadow-[var(--shadow-3)]">
          <DialogHeader className="px-[22px] pt-[18px] pb-3">
            <DialogTitle className="text-[17px] font-bold tracking-[-0.01em] text-[color:var(--text-1)]">
              {t('invoices.mark_paid.title')}
            </DialogTitle>
            <DialogDescription className="text-[13px] text-[color:var(--text-3)]">
              {formatMoney(invoice.amount_after_discount)}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={markPaidForm.handleSubmit(handleMarkPaid)}
            className="flex flex-col gap-4 px-[22px] pb-[18px]"
          >
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                {t('invoices.mark_paid.paid_at')}
              </Label>
              <Input
                type="datetime-local"
                {...markPaidForm.register('paid_at')}
                placeholder={t('invoices.mark_paid.paid_at_placeholder')}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                {t('invoices.mark_paid.note')}
              </Label>
              <Textarea
                {...markPaidForm.register('note')}
                placeholder={t('invoices.mark_paid.note_placeholder')}
                rows={2}
                className="min-h-[60px] resize-y border-[var(--border)] bg-[var(--bg-elev)] text-[14px] text-[color:var(--text-1)] placeholder:text-[color:var(--text-4)]"
              />
            </div>

            <div className="flex items-start gap-2 rounded-[var(--r-md)] bg-[var(--info-soft)] p-3">
              <InfoIcon className="mt-0.5 size-4 shrink-0 text-[color:var(--info-fg)]" />
              <div className="text-[12.5px] text-[color:var(--text-2)]">
                {t('invoices.mark_paid.info_banner')}
              </div>
            </div>

            <DialogFooter className="-mx-0 -mb-0 rounded-b-[var(--r-xl)] border-t border-[var(--line)] bg-transparent px-[22px] py-[14px]">
              <Button
                type="button"
                variant="outline"
                onClick={() => setMarkPaidOpen(false)}
                className="border-[var(--border)] bg-[var(--bg-elev)] text-[color:var(--text-1)] hover:bg-[var(--bg-sunken)]"
              >
                {t('invoices.mark_paid.cancel')}
              </Button>
              <Button type="submit" disabled={markPaidMutation.isPending}>
                {t('invoices.mark_paid.confirm')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Cancel modal */}
      <DestructiveConfirm
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title={t('invoices.cancel_invoice.title')}
        description={t('invoices.cancel_invoice.warning')}
        confirmLabel={t('invoices.cancel_invoice.confirm')}
        cancelLabel={t('invoices.cancel_invoice.cancel')}
        onConfirm={handleCancel}
        loading={cancelMutation.isPending}
      />
    </div>
  );
}
