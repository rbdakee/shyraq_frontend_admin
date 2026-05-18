import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/cn';

// WHY `kk` not `kz` here: this component is a generic UI widget exposing the
// user-facing locale pair {ru, kk} (matching DTO-enum locale convention). The
// backend JSONB data key is `kz` (HANDOFF §2.4) — mapping {kk→kz} is the api
// consumer's responsibility, not this presentational component's.
interface PairedI18nValue {
  ru: string;
  kk: string;
}

interface PairedI18nFieldProps {
  value: PairedI18nValue;
  onChange: (value: PairedI18nValue) => void;
  as?: 'input' | 'textarea';
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
  className?: string;
}

export function PairedI18nField({
  value,
  onChange,
  as = 'input',
  placeholder,
  disabled = false,
  rows = 4,
  className,
}: PairedI18nFieldProps) {
  const { t } = useTranslation('forms');
  const [activeLang, setActiveLang] = useState<'ru' | 'kk'>('ru');

  const ruMissing = !value.ru;
  const kkMissing = !value.kk;

  function handleChange(text: string) {
    onChange({ ...value, [activeLang]: text });
  }

  const currentValue = activeLang === 'ru' ? value.ru : value.kk;

  return (
    <div className={cn(className)}>
      <div className="mb-1.5 inline-flex rounded-[var(--r-sm)] border border-[var(--border)] bg-[var(--bg-sunken)] p-0.5 text-[11px] font-bold">
        <button
          type="button"
          onClick={() => setActiveLang('ru')}
          className={cn(
            'rounded-[3px] border-none bg-transparent px-2 py-[3px] text-[color:var(--text-3)] cursor-pointer',
            activeLang === 'ru' &&
              'bg-[var(--bg-elev)] text-[color:var(--text-1)] shadow-[var(--shadow-1)]',
          )}
        >
          RU
          {ruMissing && <span className="ml-1 text-[color:var(--warning)]">●</span>}
        </button>
        <button
          type="button"
          onClick={() => setActiveLang('kk')}
          className={cn(
            'rounded-[3px] border-none bg-transparent px-2 py-[3px] text-[color:var(--text-3)] cursor-pointer',
            activeLang === 'kk' &&
              'bg-[var(--bg-elev)] text-[color:var(--text-1)] shadow-[var(--shadow-1)]',
          )}
        >
          KK
          {kkMissing && <span className="ml-1 text-[color:var(--warning)]">●</span>}
        </button>
      </div>

      {as === 'textarea' ? (
        <Textarea
          value={currentValue}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={
            placeholder ??
            t('bilingual_placeholder', {
              lang: activeLang.toUpperCase(),
              defaultValue: `Введите текст (${activeLang.toUpperCase()})`,
            })
          }
          disabled={disabled}
          rows={rows}
        />
      ) : (
        <Input
          value={currentValue}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={
            placeholder ??
            t('bilingual_placeholder', {
              lang: activeLang.toUpperCase(),
              defaultValue: `Введите текст (${activeLang.toUpperCase()})`,
            })
          }
          disabled={disabled}
        />
      )}
    </div>
  );
}
