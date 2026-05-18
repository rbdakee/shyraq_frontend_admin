import type { ReactNode } from 'react';

interface DataTableToolbarProps {
  children: ReactNode;
}

export function DataTableToolbar({ children }: DataTableToolbarProps) {
  return (
    <div className="flex items-center gap-2.5 border-b border-[var(--line)] bg-[var(--bg-subtle)] px-3.5 py-3">
      {children}
    </div>
  );
}
