import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface StickyBottomBarProps {
  children: ReactNode;
  className?: string;
}

// WHY bottom: 88px — sits clear of the floating mobile tab bar
// (`.m-tabbar` at bottom: 22px + height 60px + 6px gap).
// Used inside `.m-shell` (position: relative) on form/wizard screens.
export function StickyBottomBar({ children, className }: StickyBottomBarProps) {
  return (
    <div
      className={cn('absolute right-2 bottom-[88px] left-2 z-[4] flex gap-2 px-2 pt-2', className)}
    >
      {children}
    </div>
  );
}
