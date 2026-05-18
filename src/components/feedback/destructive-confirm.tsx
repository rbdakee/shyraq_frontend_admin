import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/cn';

interface DestructiveConfirmProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  requireReason?: boolean;
  minLen?: number;
  maxLen?: number;
  onConfirm: (reason?: string) => void;
  loading?: boolean;
}

export function DestructiveConfirm({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  requireReason = false,
  minLen = 1,
  maxLen = 500,
  onConfirm,
  loading = false,
}: DestructiveConfirmProps) {
  const { t } = useTranslation('feedback');
  const [reason, setReason] = useState('');

  const trimmedLen = reason.trim().length;
  const reasonValid = !requireReason || (trimmedLen >= minLen && trimmedLen <= maxLen);
  const isOverLimit = trimmedLen > maxLen;

  function handleConfirm() {
    if (!reasonValid) return;
    onConfirm(requireReason ? reason.trim() : undefined);
    setReason('');
  }

  function handleOpenChange(next: boolean) {
    if (!next) setReason('');
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          'sm:max-w-[480px] rounded-[var(--r-xl)] border-[var(--line)] bg-[var(--bg-elev)] p-0 shadow-[var(--shadow-3)]',
        )}
        showCloseButton
      >
        <DialogHeader className="px-[22px] pt-[18px] pb-3">
          <DialogTitle className="text-[17px] font-bold tracking-[-0.01em] text-[color:var(--text-1)]">
            {title ?? t('confirm_title')}
          </DialogTitle>
          <DialogDescription className="text-[13px] text-[color:var(--text-3)]">
            {description ?? t('confirm_destructive')}
          </DialogDescription>
        </DialogHeader>

        {requireReason && (
          <div className="px-[22px] pb-[18px]">
            <label className="mb-1.5 block text-[12.5px] font-semibold text-[color:var(--text-2)]">
              {t('reason_label')}
              <span className="text-[color:var(--danger)]"> *</span>
            </label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('reason_placeholder')}
              rows={3}
              className="min-h-[80px] resize-y border-[var(--border)] bg-[var(--bg-elev)] text-[14px] text-[color:var(--text-1)] placeholder:text-[color:var(--text-4)] focus:border-[var(--primary)] focus:shadow-[var(--focus-ring)]"
            />
            <div
              className={cn(
                'mt-1.5 text-right text-[12px]',
                isOverLimit ? 'text-[color:var(--danger-fg)]' : 'text-[color:var(--text-3)]',
              )}
            >
              {t('reason_counter', { count: trimmedLen, max: maxLen })}
            </div>
          </div>
        )}

        <DialogFooter className="-mx-0 -mb-0 rounded-b-[var(--r-xl)] border-t border-[var(--line)] bg-transparent px-[22px] py-[14px]">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="border-[var(--border)] bg-[var(--bg-elev)] text-[color:var(--text-1)] hover:bg-[var(--bg-sunken)]"
          >
            {cancelLabel ?? t('cancel', { ns: 'common' })}
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!reasonValid || loading}
            className="bg-[var(--danger)] text-white hover:bg-[color:color-mix(in_oklab,var(--danger)_80%,black)] disabled:opacity-50"
          >
            {confirmLabel ?? t('confirm_button')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
