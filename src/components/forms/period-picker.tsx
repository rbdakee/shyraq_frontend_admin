import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  format,
} from 'date-fns';
import { ru, kk } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/cn';
import type { DateRange } from 'react-day-picker';

interface PeriodPickerValue {
  from?: Date;
  to?: Date;
}

interface PeriodPickerProps {
  value: PeriodPickerValue;
  onChange: (value: PeriodPickerValue) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function PeriodPicker({
  value,
  onChange,
  placeholder,
  disabled = false,
  className,
}: PeriodPickerProps) {
  const { t, i18n } = useTranslation('forms');
  const [open, setOpen] = useState(false);

  const locale = i18n.language === 'kk' ? kk : ru;

  function formatRange(range: PeriodPickerValue): string {
    if (!range.from && !range.to) {
      return placeholder ?? t('period_placeholder', { defaultValue: 'Выберите период' });
    }
    const from = range.from ? format(range.from, 'dd.MM.yyyy', { locale }) : '...';
    const to = range.to ? format(range.to, 'dd.MM.yyyy', { locale }) : '...';
    return `${from} — ${to}`;
  }

  function handlePreset(presetFn: () => PeriodPickerValue) {
    onChange(presetFn());
    setOpen(false);
  }

  function handleRangeSelect(range: DateRange | undefined) {
    onChange({
      from: range?.from ?? undefined,
      to: range?.to ?? undefined,
    });
  }

  const presets: Array<{ label: string; fn: () => PeriodPickerValue }> = [
    {
      label: t('period_today', { defaultValue: 'Сегодня' }),
      fn: () => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) }),
    },
    {
      label: t('period_week', { defaultValue: 'Неделя' }),
      fn: () => ({
        from: startOfWeek(new Date(), { weekStartsOn: 1 }),
        to: endOfWeek(new Date(), { weekStartsOn: 1 }),
      }),
    },
    {
      label: t('period_month', { defaultValue: 'Месяц' }),
      fn: () => ({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
      }),
    },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start gap-2 border-[var(--border)] bg-[var(--bg-elev)] text-left text-[14px] font-normal text-[color:var(--text-1)] hover:bg-[var(--bg-sunken)]',
            !value.from && !value.to && 'text-[color:var(--text-4)]',
            className,
          )}
        >
          <CalendarIcon className="size-4 text-[color:var(--text-3)]" />
          {formatRange(value)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex gap-2 border-b border-[var(--line)] p-2">
          {presets.map((preset) => (
            <Button
              key={preset.label}
              variant="ghost"
              size="sm"
              onClick={() => handlePreset(preset.fn)}
              className="text-[12px]"
            >
              {preset.label}
            </Button>
          ))}
        </div>
        <Separator />
        <Calendar
          mode="range"
          selected={value.from || value.to ? { from: value.from, to: value.to } : undefined}
          onSelect={handleRangeSelect}
          locale={locale}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  );
}
