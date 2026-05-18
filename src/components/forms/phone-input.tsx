import { forwardRef, type ChangeEvent } from 'react';
import { cn } from '@/lib/cn';
import { PhoneIcon } from 'lucide-react';

const COUNTRY_CODE = '+7';
const MASK_PARTS = [3, 3, 2, 2];
const MAX_DIGITS = 10;

function formatPhone(digits: string): string {
  const d = digits.slice(0, MAX_DIGITS);
  const parts: string[] = [];
  let offset = 0;
  for (const len of MASK_PARTS) {
    if (offset >= d.length) break;
    parts.push(d.slice(offset, offset + len));
    offset += len;
  }
  return parts.length > 0 ? `${COUNTRY_CODE} ${parts.join(' ')}` : COUNTRY_CODE;
}

function extractDigits(raw: string): string {
  const stripped = raw.replace(/\D/g, '');
  if (stripped.startsWith('7') && stripped.length > 1) {
    return stripped.slice(1, 1 + MAX_DIGITS);
  }
  if (stripped.startsWith('87') && stripped.length > 1) {
    return stripped.slice(1, 1 + MAX_DIGITS);
  }
  return stripped.slice(0, MAX_DIGITS);
}

function toE164(digits: string): string {
  if (digits.length !== MAX_DIGITS) return '';
  return `+7${digits}`;
}

interface PhoneInputProps {
  value: string;
  onChange: (e164: string) => void;
  disabled?: boolean;
  hasError?: boolean;
  className?: string;
  placeholder?: string;
}

const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(function PhoneInput(
  { value, onChange, disabled, hasError, className, placeholder },
  ref,
) {
  const digits = value.startsWith('+7') ? value.slice(2).replace(/\D/g, '') : '';
  const displayValue = formatPhone(digits);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    const newDigits = extractDigits(raw);
    onChange(toE164(newDigits) || `+7${newDigits}`);
  }

  return (
    <div className="relative">
      <PhoneIcon className="pointer-events-none absolute left-3 top-1/2 h-[14px] w-[14px] -translate-y-1/2 text-text-4" />
      <input
        ref={ref}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={displayValue}
        onChange={handleChange}
        disabled={disabled}
        placeholder={placeholder ?? '+7 ___ ___ __ __'}
        className={cn(
          'h-10 w-full rounded-[var(--r-md)] border bg-bg-elev pl-9 pr-3 text-sm text-text-1 outline-none transition-[border,box-shadow]',
          'border-border hover:border-border-strong',
          'focus:border-primary focus:shadow-[var(--focus-ring)]',
          'disabled:cursor-not-allowed disabled:bg-bg-sunken disabled:text-text-3',
          'placeholder:text-text-4',
          hasError && 'border-danger',
          className,
        )}
      />
    </div>
  );
});

export { PhoneInput };
