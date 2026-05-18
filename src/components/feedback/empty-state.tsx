import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { InboxIcon, FilterIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

interface EmptyStateProps {
  icon?: ReactNode;
  title?: string;
  text?: string;
  action?: ReactNode;
  variant?: 'default' | 'filtered';
  onResetFilters?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  text,
  action,
  variant = 'default',
  onResetFilters,
  className,
}: EmptyStateProps) {
  const { t } = useTranslation('feedback');

  const isFiltered = variant === 'filtered';

  const defaultIcon = isFiltered ? (
    <FilterIcon className="size-9 text-[color:var(--text-4)]" />
  ) : (
    <InboxIcon className="size-9 text-[color:var(--text-4)]" />
  );

  const defaultTitle = isFiltered
    ? t('filtered_empty_title', { defaultValue: 'Ничего не найдено' })
    : t('empty_title');

  const defaultText = isFiltered
    ? t('filtered_empty_text', { defaultValue: 'Попробуйте изменить параметры фильтра' })
    : undefined;

  return (
    <div className={cn('flex flex-col items-center gap-3 py-12 px-6 text-center', className)}>
      <div className="flex size-24 items-center justify-center rounded-3xl bg-[var(--bg-sunken)]">
        {icon ?? defaultIcon}
      </div>
      <div className="text-[15px] font-semibold text-[color:var(--text-1)]">
        {title ?? defaultTitle}
      </div>
      {(text ?? defaultText) && (
        <div className="max-w-[340px] text-[13px] text-[color:var(--text-3)]">
          {text ?? defaultText}
        </div>
      )}
      {isFiltered && onResetFilters && (
        <Button variant="outline" onClick={onResetFilters} className="mt-1">
          {t('reset_filters', { defaultValue: 'Сбросить фильтры' })}
        </Button>
      )}
      {action}
    </div>
  );
}
