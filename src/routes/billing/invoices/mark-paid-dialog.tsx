import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { InfoIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { useMarkInvoicePaid, type InvoiceResponseDto } from '@/hooks/use-invoices';
import { qk } from '@/hooks/query-keys';
import { formatMoney, parseMoneyInput } from '@/lib/format';
import { toI18nKey, isAppError } from '@/lib/error-map';

const MarkPaidSchema = z.object({
  amount: z.string().refine((v) => {
    const parsed = parseMoneyInput(v);
    return parsed !== null && parsed > 0;
  }, 'amount_invalid'),
  paid_at: z.string().default(''),
  note: z.string().default(''),
});

type MarkPaidForm = z.infer<typeof MarkPaidSchema>;

interface MarkPaidDialogProps {
  invoice: InvoiceResponseDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Shared "mark invoice paid in cash" dialog (B29/B30) — used by the invoice
 * card and the child card billing tab. Owns the form, validation and toasts;
 * the caller only controls open state and supplies the invoice.
 */
export function MarkPaidDialog({ invoice, open, onOpenChange }: MarkPaidDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] rounded-[var(--r-xl)] border-[var(--line)] bg-[var(--bg-elev)] p-0 shadow-[var(--shadow-3)]">
        {open && invoice ? (
          <MarkPaidDialogBody invoice={invoice} close={() => onOpenChange(false)} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

// Mounted only while the dialog is open, so useForm defaultValues re-prefill
// the amount with the invoice's current remainder on every open.
function MarkPaidDialogBody({
  invoice,
  close,
}: {
  invoice: InvoiceResponseDto;
  close: () => void;
}) {
  const { t } = useTranslation('billing');
  const queryClient = useQueryClient();
  const markPaidMutation = useMarkInvoicePaid(invoice.id);

  const form = useForm<MarkPaidForm>({
    resolver: zodResolver(MarkPaidSchema) as Resolver<MarkPaidForm>,
    defaultValues: { amount: String(invoice.amount_remaining), paid_at: '', note: '' },
  });

  function handleSubmit(data: MarkPaidForm) {
    const remaining = invoice.amount_remaining;
    const amount = parseMoneyInput(data.amount) ?? 0;
    if (amount > remaining) {
      form.setError('amount', { message: 'amount_exceeds' });
      return;
    }
    const isPartial = amount < remaining;
    // Backend DTO rejects partial amounts below 1 KZT (@Min(1)); a full
    // settlement (== remaining) never sends `amount`, so it is exempt.
    if (isPartial && amount < 1) {
      form.setError('amount', { message: 'amount_invalid' });
      return;
    }
    markPaidMutation.mutate(
      {
        // §A37: `amount` goes on the wire only for a genuine partial payment;
        // omitting it for a full settlement keeps the legacy body shape.
        ...(isPartial ? { amount } : {}),
        paid_at: data.paid_at || null,
        note: data.note || null,
      },
      {
        onSuccess: (updated) => {
          close();
          if (isPartial && updated.amount_remaining === 0) {
            // §A37 guard: a concurrent payment settled the invoice while the
            // dialog was open (or backend ignored the partial amount).
            toast.warning(t('invoices.mark_paid.warning_closed_full'));
          } else if (isPartial) {
            toast.success(
              t('invoices.mark_paid.success_partial', { amount: formatMoney(amount) }),
            );
          } else {
            toast.success(t('invoices.mark_paid.success'));
          }
        },
        onError: (err) => {
          toast.error(t(toI18nKey(err), { defaultValue: t('errors:unknown_error') }));
          if (
            isAppError(err) &&
            (err.code === 'invoice_already_paid' || err.code === 'invoice_status_invalid')
          ) {
            // 409 means the invoice changed under us (concurrent payment
            // settled it, or the entered amount now exceeds the remainder) —
            // refetch so the dialog reopens with fresh numbers.
            void queryClient.invalidateQueries({ queryKey: qk.invoices.all });
          }
          console.error(err);
        },
      },
    );
  }

  return (
    <>
      <DialogHeader className="px-[22px] pt-[18px] pb-3">
        <DialogTitle className="text-[17px] font-bold tracking-[-0.01em] text-[color:var(--text-1)]">
          {t('invoices.mark_paid.title')}
        </DialogTitle>
        <DialogDescription className="text-[13px] text-[color:var(--text-3)]">
          {formatMoney(invoice.amount_after_discount)}
        </DialogDescription>
      </DialogHeader>

      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="flex flex-col gap-4 px-[22px] pb-[18px]"
      >
        <div className="flex flex-col gap-1.5">
          <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
            {t('invoices.mark_paid.amount_label')}
          </Label>
          <Input
            inputMode="decimal"
            {...form.register('amount')}
            placeholder={t('invoices.mark_paid.amount_placeholder')}
          />
          <p className="text-[12px] text-[color:var(--text-3)]">
            {t('invoices.mark_paid.amount_hint', {
              amount: formatMoney(invoice.amount_remaining),
            })}
          </p>
          {form.formState.errors.amount && (
            <p className="text-[12px] text-[color:var(--danger-fg)]">
              {form.formState.errors.amount.message === 'amount_exceeds'
                ? t('invoices.mark_paid.amount_exceeds', {
                    amount: formatMoney(invoice.amount_remaining),
                  })
                : t('invoices.mark_paid.amount_invalid')}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
            {t('invoices.mark_paid.paid_at')}
          </Label>
          <Input
            type="datetime-local"
            {...form.register('paid_at')}
            placeholder={t('invoices.mark_paid.paid_at_placeholder')}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
            {t('invoices.mark_paid.note')}
          </Label>
          <Textarea
            {...form.register('note')}
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
            onClick={close}
            className="border-[var(--border)] bg-[var(--bg-elev)] text-[color:var(--text-1)] hover:bg-[var(--bg-sunken)]"
          >
            {t('invoices.mark_paid.cancel')}
          </Button>
          <Button type="submit" disabled={markPaidMutation.isPending}>
            {t('invoices.mark_paid.confirm')}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
