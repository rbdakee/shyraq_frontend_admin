import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowRightIcon, BanknoteIcon, ChevronRightIcon, CreditCardIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { SkeletonBox } from '@/components/feedback/skeleton';
import { useInvoicesList, type InvoiceResponseDto } from '@/hooks/use-invoices';
import { useInfinitePaymentsList } from '@/hooks/use-payments';
import { formatMoney, formatDate, formatDateTime } from '@/lib/format';
import { uniqueById } from '@/lib/collections';
import { DEFAULT_TIMEZONE } from '@/lib/constants';
import {
  INVOICE_STATUS_BADGE,
  MARKABLE_STATUSES,
} from '@/routes/billing/invoices/invoice-constants';
import { MarkPaidDialog } from '@/routes/billing/invoices/mark-paid-dialog';
import {
  PAYMENT_STATUS_BADGE,
  PROVIDER_I18N_KEYS,
} from '@/routes/billing/payments/payment-constants';

const TH_CLASS =
  'border-b border-[var(--line)] bg-[var(--bg-subtle)] px-3.5 py-2.5 text-left text-[12px] font-semibold uppercase tracking-[0.04em] text-[color:var(--text-3)]';
const TH_NUM_CLASS =
  'border-b border-[var(--line)] bg-[var(--bg-subtle)] px-3.5 py-2.5 text-right text-[12px] font-semibold uppercase tracking-[0.04em] text-[color:var(--text-3)]';

export default function BillingTab({ childId }: { childId: string }) {
  const { t } = useTranslation(['children', 'billing']);
  const navigate = useNavigate();
  const tz = DEFAULT_TIMEZONE;

  const invoicesQuery = useInvoicesList({ child_id: childId });
  const paymentsInfinite = useInfinitePaymentsList({ child_id: childId });
  const payments = uniqueById(paymentsInfinite.data?.pages.flat() ?? []);
  const invoices = [...(invoicesQuery.data ?? [])].sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  );

  const [markPaidInvoice, setMarkPaidInvoice] = useState<InvoiceResponseDto | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] shadow-[var(--shyraq-shadow-1)]">
        <div className="flex items-center justify-between border-b border-[var(--line)] px-[18px] py-[14px]">
          <div>
            <div className="text-[15px] font-semibold text-[color:var(--text-1)]">
              {t('detail.payments.header')}
            </div>
            <div className="mt-0.5 text-[12px] text-[color:var(--text-3)]">
              {t('detail.payments.caption')}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/billing/invoices?child=${childId}`)}
          >
            {t('detail.payments.view_all')}
            <ArrowRightIcon className="size-4" />
          </Button>
        </div>
        {invoicesQuery.isPending ? (
          <div className="p-5">
            <SkeletonBox height={120} />
          </div>
        ) : invoicesQuery.isError ? (
          <ErrorState
            title={t('detail.payments.load_error')}
            onRetry={() => invoicesQuery.refetch()}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13.5px]">
              <thead>
                <tr>
                  <th className={TH_CLASS}>{t('detail.payments.col_invoice')}</th>
                  <th className={TH_CLASS}>{t('detail.payments.col_period')}</th>
                  <th className={TH_NUM_CLASS}>{t('detail.payments.col_amount')}</th>
                  <th className={TH_NUM_CLASS}>{t('detail.payments.col_paid')}</th>
                  <th className={TH_NUM_CLASS}>{t('detail.payments.col_remaining')}</th>
                  <th className={TH_CLASS}>{t('detail.payments.col_status')}</th>
                  <th className={TH_CLASS}>{t('detail.payments.col_due')}</th>
                  <th className={TH_CLASS} />
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <EmptyState
                        title={t('detail.payments.empty_title')}
                        text={t('detail.payments.empty_text')}
                      />
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => {
                    const remainingAccent =
                      inv.amount_remaining > 0 &&
                      (inv.status === 'partial' || inv.status === 'overdue');
                    return (
                      <tr
                        key={inv.id}
                        className="cursor-pointer border-b border-[var(--line)] transition-colors last:border-b-0 hover:bg-[var(--bg-sunken)]"
                        onClick={() => navigate(`/billing/invoices/${inv.id}`)}
                      >
                        <td className="px-3.5 py-3 font-mono text-[12.5px] text-[color:var(--text-2)]">
                          {inv.id.slice(0, 8)}
                        </td>
                        <td className="px-3.5 py-3 text-[color:var(--text-2)]">
                          {formatDate(inv.period_start, tz)} – {formatDate(inv.period_end, tz)}
                        </td>
                        <td className="px-3.5 py-3 text-right font-semibold tabular-nums text-[color:var(--text-1)]">
                          {formatMoney(inv.amount_after_discount)}
                        </td>
                        <td
                          className={`px-3.5 py-3 text-right tabular-nums ${
                            inv.amount_paid > 0
                              ? 'text-[color:var(--text-1)]'
                              : 'text-[color:var(--text-4)]'
                          }`}
                        >
                          {formatMoney(inv.amount_paid)}
                        </td>
                        <td
                          className={`px-3.5 py-3 text-right font-semibold tabular-nums ${
                            remainingAccent
                              ? 'text-[color:var(--danger-fg)]'
                              : 'text-[color:var(--text-2)]'
                          }`}
                        >
                          {formatMoney(inv.amount_remaining)}
                        </td>
                        <td className="px-3.5 py-3">
                          <Badge variant={INVOICE_STATUS_BADGE[inv.status]} dot>
                            {t(`billing:invoices.status.${inv.status}`)}
                          </Badge>
                        </td>
                        <td className="px-3.5 py-3 text-[color:var(--text-2)]">
                          {formatDate(inv.due_date, tz)}
                        </td>
                        <td className="px-3.5 py-3 text-right">
                          {MARKABLE_STATUSES.includes(inv.status) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMarkPaidInvoice(inv);
                              }}
                            >
                              <BanknoteIcon className="size-4" />
                              {t('detail.payments.pay_cash')}
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] shadow-[var(--shyraq-shadow-1)]">
        <div className="border-b border-[var(--line)] px-[18px] py-[14px]">
          <div className="text-[15px] font-semibold text-[color:var(--text-1)]">
            {t('detail.payments.payments_header')}
          </div>
          <div className="mt-0.5 text-[12px] text-[color:var(--text-3)]">
            {t('detail.payments.payments_caption')}
          </div>
        </div>
        {paymentsInfinite.isPending ? (
          <div className="p-5">
            <SkeletonBox height={80} />
          </div>
        ) : paymentsInfinite.isError ? (
          <ErrorState
            title={t('detail.payments.load_error')}
            onRetry={() => paymentsInfinite.refetch()}
          />
        ) : payments.length === 0 ? (
          <EmptyState
            icon={<CreditCardIcon className="size-9 text-[color:var(--text-4)]" />}
            title={t('detail.payments.payments_empty')}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13.5px]">
              <thead>
                <tr>
                  <th className={TH_CLASS}>{t('billing:payments.columns.date')}</th>
                  <th className={TH_CLASS}>{t('detail.payments.col_invoice')}</th>
                  <th className={TH_NUM_CLASS}>{t('billing:payments.columns.amount')}</th>
                  <th className={TH_CLASS}>{t('billing:payments.columns.provider')}</th>
                  <th className={TH_CLASS}>{t('billing:payments.columns.status')}</th>
                  <th className={TH_CLASS} />
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr
                    key={p.id}
                    className="cursor-pointer border-b border-[var(--line)] transition-colors last:border-b-0 hover:bg-[var(--bg-sunken)]"
                    onClick={() => navigate(`/billing/payments/${p.id}`)}
                  >
                    <td className="px-3.5 py-3 text-[color:var(--text-1)]">
                      {formatDateTime(p.created_at, tz)}
                    </td>
                    <td className="px-3.5 py-3 font-mono text-[12.5px] text-[color:var(--text-2)]">
                      {p.invoice_id.slice(0, 8)}
                    </td>
                    <td className="px-3.5 py-3 text-right font-semibold tabular-nums text-[color:var(--text-1)]">
                      {formatMoney(p.amount)}
                    </td>
                    <td className="px-3.5 py-3 text-[color:var(--text-2)]">
                      {t(`billing:${PROVIDER_I18N_KEYS[p.provider]}`)}
                    </td>
                    <td className="px-3.5 py-3">
                      <Badge variant={PAYMENT_STATUS_BADGE[p.status]} dot>
                        {t(`billing:payments.status.${p.status}`)}
                      </Badge>
                    </td>
                    <td className="px-3.5 py-3 text-right">
                      <ChevronRightIcon className="inline-block size-3.5 text-[color:var(--text-4)]" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {paymentsInfinite.hasNextPage && (
              <div className="border-t border-[var(--line)] px-5 py-3 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void paymentsInfinite.fetchNextPage()}
                  disabled={paymentsInfinite.isFetchingNextPage}
                >
                  {t('billing:invoices.detail.load_more_payments')}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <MarkPaidDialog
        invoice={markPaidInvoice}
        open={markPaidInvoice !== null}
        onOpenChange={(open) => {
          if (!open) setMarkPaidInvoice(null);
        }}
      />
    </div>
  );
}
