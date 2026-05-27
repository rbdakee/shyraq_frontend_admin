import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface StickyBottomBarProps {
  children: ReactNode;
  className?: string;
}

// WHY position:fixed + safe-area bottom — pinned to the visual viewport above
// the floating .m-tabbar (height 60 + safe-area-inset-bottom + 6px gap).
// Document-scroll architecture means there's no positioned shell ancestor to
// anchor `position: absolute` to.
export function StickyBottomBar({ children, className }: StickyBottomBarProps) {
  return (
    <div
      className={cn('fixed right-2 left-2 z-[4] flex gap-2 px-2 pt-2', className)}
      style={{ bottom: 'calc(max(8px, env(safe-area-inset-bottom)) + 66px)' }}
    >
      {children}
    </div>
  );
}
