import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeftIcon, XIcon } from 'lucide-react';

import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/cn';

interface FullScreenSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  sub?: string;
  description?: string;
  // When provided, the top-left button renders as a back chevron and
  // calls this instead of closing — used by wizards where back navigates steps.
  onBack?: () => void;
  children: ReactNode;
  // Sticky bottom slot — typically StickyBottomBar or a plain button row.
  footer?: ReactNode;
  className?: string;
}

// Full-screen sheet used as the mobile replacement for desktop Dialog.
// Top bar mirrors `.m-bar` (back/close button + title + sub). The sheet itself
// covers the viewport bottom-up; the body scrolls (`.m-scroll`-like padding,
// extra bottom padding when a footer is present so content does not hide
// behind the sticky bar).
export function FullScreenSheet({
  open,
  onOpenChange,
  title,
  sub,
  description,
  onBack,
  children,
  footer,
  className,
}: FullScreenSheetProps) {
  const { t } = useTranslation('common');
  const isBack = !!onBack;
  const handleTopButton = isBack ? onBack : () => onOpenChange(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className={cn(
          'flex h-[100dvh] max-h-[100dvh] flex-col gap-0 rounded-none border-t-0 bg-[var(--bg)] p-0 text-[color:var(--text-1)]',
          className,
        )}
      >
        <div className="m-bar">
          <button
            type="button"
            className="m-iconbtn ghost"
            onClick={handleTopButton}
            aria-label={isBack ? t('actions.back') : t('actions.close')}
            data-testid="full-screen-sheet-top-btn"
          >
            {isBack ? <ChevronLeftIcon /> : <XIcon />}
          </button>
          <div className="min-w-0 flex-1">
            <SheetTitle className="m-bar-title overflow-hidden text-[20px] font-bold text-ellipsis whitespace-nowrap text-[color:var(--text-1)]">
              {title}
            </SheetTitle>
            {sub && <div className="m-bar-sub">{sub}</div>}
            {description && <SheetDescription className="sr-only">{description}</SheetDescription>}
          </div>
        </div>
        <div className={cn('flex-1 overflow-y-auto px-4 pt-4', footer ? 'pb-[110px]' : 'pb-6')}>
          {children}
        </div>
        {footer && (
          <div className="absolute right-2 bottom-6 left-2 z-[4] flex gap-2 px-2 pt-2">
            {footer}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
