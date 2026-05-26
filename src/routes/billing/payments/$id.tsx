import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ChevronRightIcon,
  ReceiptIcon,
  UsersIcon,
  CheckIcon,
  ClockIcon,
  MoreHorizontalIcon,
} from 'lucide-react';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import MobileTopBar from '@/components/layout/mobile-top-bar';

import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { JsonViewer } from '@/components/feedback/json-viewer';
import { ErrorState } from '@/components/feedback/error-state';
import { SkeletonLine, SkeletonBox } from '@/components/feedback/skeleton';
import { usePayment, type PaymentResponseDto } from '@/hooks/use-payments';
import { useChildrenList } from '@/hooks/use-children';
import { formatMoney, formatDateTime, getInitials } from '@/lib/format';
import { DEFAULT_TIMEZONE } from '@/lib/constants';
import { PAYMENT_STATUS_BADGE, PROVIDER_I18N_KEYS } from './payment-constants';

function paymentDtoToRecord(p: PaymentResponseDto): Record<string, unknown> {
  return {
    id: p.id,
    kindergarten_id: p.kindergarten_id,
    invoice_id: p.invoice_id,
    child_id: p.child_id,
    payer_user_id: p.payer_user_id,
    amount: p.amount,
    provider: p.provider,
    provider_txn_id: p.provider_txn_id,
    idempotency_key: p.idempotency_key,
    status: p.status,
    paid_at: p.paid_at,
    refund_id: p.refund_id,
    redirect_url: p.redirect_url ?? null,
    deeplink: p.deeplink ?? null,
    created_at: p.created_at,
    updated_at: p.updated_at,
  };
}

export default function PaymentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation('billing');
  const tz = DEFAULT_TIMEZONE;
  const { isMobile } = useBreakpoint();

  const paymentQuery = usePayment(id ?? '');
  const payment = paymentQuery.data;

  const childrenQuery = useChildrenList({ status: 'active', limit: 200, offset: 0 });
  const childName = useMemo(
    () => childrenQuery.data?.data.find((c) => c.id === payment?.child_id)?.full_name ?? null,
    [childrenQuery.data, payment?.child_id],
  );

  if (paymentQuery.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <SkeletonLine width={200} height={14} />
        <SkeletonBox height={120} />
        <SkeletonBox height={300} />
      </div>
    );
  }

  if (paymentQuery.isError || !payment) {
    return (
      <ErrorState title={t('payments.detail.not_found')} onRetry={() => paymentQuery.refetch()} />
    );
  }

  const dtoRecord = paymentDtoToRecord(payment);

  const statusTone: Record<string, string> = {
    completed: 'success',
    failed: 'danger',
    processing: 'info',
    initiated: 'neutral',
    refunded: 'warning',
  };
  const payTone = statusTone[payment.status] ?? 'neutral';

  if (isMobile) {
    return (
      <div className="m-shell">
        <MobileTopBar
          title={payment.id.slice(0, 8)}
          sub={`${t('payments.detail.breadcrumb')} · ${t(PROVIDER_I18N_KEYS[payment.provider])}`}
          back
          action={
            <button type="button" className="m-iconbtn ghost">
              <MoreHorizontalIcon className="size-5" />
            </button>
          }
        />
        <div className="m-scroll">
          <div className="m-card" style={{ padding: 20, marginBottom: 14, textAlign: 'center' }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: `var(--${payTone}-soft)`,
                color: `var(--${payTone}-fg)`,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 10,
              }}
            >
              <CheckIcon style={{ width: 32, height: 32 }} />
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: `var(--${payTone}-fg)`,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              {t(`payments.status.${payment.status}`)}
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em', marginTop: 6 }}>
              {formatMoney(payment.amount)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
              {formatDateTime(payment.created_at, tz)}
            </div>
          </div>

          <div className="m-card flush" style={{ marginBottom: 14 }}>
            <div className="m-kv">
              <span className="k">{t('mobile.payment_detail_invoice')}</span>
              <span className="v" style={{ color: 'var(--primary)', fontWeight: 600 }}>
                {payment.invoice_id.slice(0, 8)} →
              </span>
            </div>
            <div className="m-kv">
              <span className="k">{t('mobile.payment_detail_child')}</span>
              <span className="v">{childName ?? payment.child_id.slice(0, 8)}</span>
            </div>
            <div className="m-kv">
              <span className="k">{t('mobile.payment_detail_provider')}</span>
              <span className="v">{t(PROVIDER_I18N_KEYS[payment.provider])}</span>
            </div>
            {payment.provider_txn_id && (
              <div className="m-kv">
                <span className="k">{t('mobile.payment_detail_reference')}</span>
                <span
                  className="v"
                  style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}
                >
                  {payment.provider_txn_id}
                </span>
              </div>
            )}
          </div>

          <div className="m-section-h">
            <div className="m-section-title">{t('mobile.payment_detail_events')}</div>
          </div>
          <div className="m-card flush" style={{ padding: '4px 0' }}>
            <div className="m-tl">
              {payment.paid_at && (
                <div className="m-tl-item">
                  <div className="m-tl-dot">
                    <CheckIcon className="size-3" />
                  </div>
                  <div>
                    <div className="m-tl-title">{t('mobile.payment_detail_completed')}</div>
                    <div className="m-tl-meta">{formatDateTime(payment.paid_at, tz)}</div>
                  </div>
                </div>
              )}
              <div className="m-tl-item">
                <div className="m-tl-dot neutral">
                  <ClockIcon className="size-3" />
                </div>
                <div>
                  <div className="m-tl-title">{t('payments.status.initiated')}</div>
                  <div className="m-tl-meta">{formatDateTime(payment.created_at, tz)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[14px]">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[12px] text-[color:var(--text-3)]">
        <Link to="/billing/payments" className="hover:text-[color:var(--primary)]">
          {t('payments.title')}
        </Link>
        <ChevronRightIcon className="size-3 text-[color:var(--text-4)]" />
        <span className="text-[color:var(--text-1)]">{payment.id.slice(0, 8)}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold leading-tight text-[color:var(--text-1)]">
            {t('payments.detail.title', { id: payment.id.slice(0, 8) })}
          </h1>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant={PAYMENT_STATUS_BADGE[payment.status]} dot>
              {t(`payments.status.${payment.status}`)}
            </Badge>
            <span className="text-[12px] text-[color:var(--text-3)]">
              {t('payments.detail.created_label')} {formatDateTime(payment.created_at, tz)}
            </span>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-[1fr_320px] gap-4">
        {/* Left column */}
        <div className="flex flex-col gap-4">
          {/* Details card */}
          <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-5">
            <h3 className="mb-3 text-[15px] font-bold text-[color:var(--text-1)]">
              {t('payments.detail.details_title')}
            </h3>
            <div
              className="text-[13.5px]"
              style={{
                display: 'grid',
                gridTemplateColumns: '160px 1fr',
                gap: '8px 16px',
              }}
            >
              <span className="text-[color:var(--text-3)]">{t('payments.columns.amount')}</span>
              <strong className="text-[18px]">{formatMoney(payment.amount)}</strong>

              <span className="text-[color:var(--text-3)]">{t('payments.columns.provider')}</span>
              <span>{t(PROVIDER_I18N_KEYS[payment.provider]) ?? payment.provider}</span>

              <span className="text-[color:var(--text-3)]">{t('payments.columns.invoice')}</span>
              <Link
                to={`/billing/invoices/${payment.invoice_id}`}
                className="font-[JetBrains_Mono,ui-monospace,monospace] text-[color:var(--primary)] hover:underline"
              >
                {payment.invoice_id.slice(0, 8)}
              </Link>

              <span className="text-[color:var(--text-3)]">{t('payments.columns.child')}</span>
              <span>{childName ?? payment.child_id.slice(0, 8)}</span>

              <span className="text-[color:var(--text-3)]">
                {t('payments.detail.created_label')}
              </span>
              <span>{formatDateTime(payment.created_at, tz)}</span>

              {payment.provider_txn_id && (
                <>
                  <span className="text-[color:var(--text-3)]">
                    {t('payments.detail.provider_txn_label')}
                  </span>
                  <span className="font-[JetBrains_Mono,ui-monospace,monospace]">
                    {payment.provider_txn_id}
                  </span>
                </>
              )}

              {payment.paid_at && (
                <>
                  <span className="text-[color:var(--text-3)]">
                    {t('payments.detail.paid_at_label')}
                  </span>
                  <span>{formatDateTime(payment.paid_at, tz)}</span>
                </>
              )}
            </div>
          </div>

          {/* JSON viewer - full DTO for support */}
          <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-[15px] font-bold text-[color:var(--text-1)]">
                {t('payments.detail.payload_title')}
              </h3>
            </div>
            <JsonViewer
              data={dtoRecord}
              label={t('payments.detail.payload_label')}
              defaultExpanded
            />
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* Invoice link */}
          <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-4">
            <h3 className="mb-3 text-[15px] font-bold text-[color:var(--text-1)]">
              {t('payments.detail.related_title')}
            </h3>
            <div className="flex flex-col gap-2">
              <Link
                to={`/billing/invoices/${payment.invoice_id}`}
                className="flex items-center gap-2.5 rounded-[var(--r-md)] bg-[var(--bg-sunken)] p-2.5 transition-colors hover:bg-[var(--bg-subtle)] no-underline text-inherit"
              >
                <ReceiptIcon className="size-4 text-[color:var(--text-3)]" />
                <div className="flex-1">
                  <div className="text-[13px] font-semibold">
                    {t('payments.detail.related_invoice')}
                  </div>
                  <div className="font-[JetBrains_Mono,ui-monospace,monospace] text-[12px] text-[color:var(--text-3)]">
                    {payment.invoice_id.slice(0, 8)}
                  </div>
                </div>
                <ChevronRightIcon className="size-3.5 text-[color:var(--text-4)]" />
              </Link>

              <Link
                to={`/children/${payment.child_id}`}
                className="flex items-center gap-2.5 rounded-[var(--r-md)] bg-[var(--bg-sunken)] p-2.5 transition-colors hover:bg-[var(--bg-subtle)] no-underline text-inherit"
              >
                <UsersIcon className="size-4 text-[color:var(--text-3)]" />
                <div className="flex-1">
                  <div className="text-[13px] font-semibold">
                    {t('payments.detail.related_child')}
                  </div>
                  <div className="text-[12px] text-[color:var(--text-3)]">
                    <div className="flex items-center gap-1.5">
                      <Avatar className="size-5">
                        <AvatarFallback className="bg-[var(--primary-soft)] text-[9px] font-bold text-[color:var(--primary)]">
                          {getInitials(childName)}
                        </AvatarFallback>
                      </Avatar>
                      {childName ?? payment.child_id.slice(0, 8)}
                    </div>
                  </div>
                </div>
                <ChevronRightIcon className="size-3.5 text-[color:var(--text-4)]" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
