import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { ChevronDownIcon, Loader2Icon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ENTITY_COMBOBOX_DEBOUNCE_MS } from '@/lib/constants';

export interface ComboboxOption {
  value: string;
  label: string;
  subLabel?: string;
  icon?: React.ReactNode;
}

interface EntityComboboxProps {
  value: string | null;
  onChange: (value: string | null, option: ComboboxOption | null) => void;
  fetchOptions: (query: string) => Promise<ComboboxOption[]>;
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
}

export function EntityCombobox({
  value,
  onChange,
  fetchOptions,
  placeholder,
  emptyText,
  disabled = false,
  className,
}: EntityComboboxProps) {
  const { t } = useTranslation('forms');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<ComboboxOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      setLoading(true);
      fetchOptions(query)
        .then((result) => {
          setOptions(result);
        })
        .catch(() => {
          setOptions([]);
        })
        .finally(() => setLoading(false));
    }, ENTITY_COMBOBOX_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, fetchOptions]);

  function handleSelect(optionValue: string) {
    if (optionValue === value) {
      onChange(null, null);
      setSelectedLabel('');
    } else {
      const opt = options.find((o) => o.value === optionValue);
      onChange(optionValue, opt ?? null);
      setSelectedLabel(opt?.label ?? '');
    }
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between border-[var(--border)] bg-[var(--bg-elev)] text-[14px] font-normal text-[color:var(--text-1)] hover:bg-[var(--bg-sunken)]',
            !value && 'text-[color:var(--text-4)]',
            className,
          )}
        >
          <span className="truncate">
            {value
              ? selectedLabel || value
              : (placeholder ?? t('combobox_placeholder', { defaultValue: 'Выберите...' }))}
          </span>
          <ChevronDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={t('combobox_search', { defaultValue: 'Поиск...' })}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {loading && (
              <div className="flex items-center justify-center py-6">
                <Loader2Icon className="size-4 animate-spin text-[color:var(--text-3)]" />
              </div>
            )}
            {!loading && options.length === 0 && (
              <CommandEmpty>
                {emptyText ?? t('combobox_empty', { defaultValue: 'Ничего не найдено' })}
              </CommandEmpty>
            )}
            {!loading && options.length > 0 && (
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={handleSelect}
                    data-checked={value === option.value ? 'true' : undefined}
                  >
                    {option.icon && (
                      <span className="mr-2 flex shrink-0 items-center">{option.icon}</span>
                    )}
                    <span className="flex flex-col">
                      <span className="text-[13.5px] text-[color:var(--text-1)]">
                        {option.label}
                      </span>
                      {option.subLabel && (
                        <span className="text-[12px] text-[color:var(--text-3)]">
                          {option.subLabel}
                        </span>
                      )}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
