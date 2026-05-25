import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

interface FilterBottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: ReactNode;
  onReset?: () => void;
  onApply?: () => void;
  applyLabel?: string;
  resetLabel?: string;
  className?: string;
}

// Bottom-sheet wrapper for mobile filters (OPEN_QUESTIONS M9 resolved: start with
// Radix Sheet side="bottom"; migrate to vaul later if drag-gesture UX is required).
// Apply/Reset footer is opt-in — pass onApply/onReset to render it.
export function FilterBottomSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  onReset,
  onApply,
  applyLabel,
  resetLabel,
  className,
}: FilterBottomSheetProps) {
  const { t } = useTranslation('common');
  const hasFooter = !!onReset || !!onApply;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className={cn(
          'max-h-[85vh] rounded-t-[20px] border-t border-[var(--line)] bg-[var(--bg-elev)] p-0 text-[color:var(--text-1)]',
          className,
        )}
      >
        <div className="mx-auto mt-2 mb-1 h-1 w-10 rounded-full bg-[var(--bg-sunken)]" />
        {(title || description) && (
          <SheetHeader className="px-4 pt-2 pb-3 text-left">
            {title && (
              <SheetTitle className="text-[17px] font-bold text-[color:var(--text-1)]">
                {title}
              </SheetTitle>
            )}
            {description && (
              <SheetDescription className="text-[12.5px] text-[color:var(--text-3)]">
                {description}
              </SheetDescription>
            )}
          </SheetHeader>
        )}
        <div className="flex-1 overflow-y-auto px-4 pt-1 pb-4">{children}</div>
        {hasFooter && (
          <div className="flex gap-2 border-t border-[var(--line)] bg-[var(--bg-subtle)] p-3">
            {onReset && (
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={onReset}
                data-testid="filter-bottom-sheet-reset"
              >
                {resetLabel ?? t('actions.reset')}
              </Button>
            )}
            {onApply && (
              <SheetClose asChild>
                <Button
                  type="button"
                  className="flex-1"
                  onClick={onApply}
                  data-testid="filter-bottom-sheet-apply"
                >
                  {applyLabel ?? t('actions.apply')}
                </Button>
              </SheetClose>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
