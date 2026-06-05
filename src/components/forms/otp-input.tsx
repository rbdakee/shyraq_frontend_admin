import {
  forwardRef,
  useRef,
  useImperativeHandle,
  type KeyboardEvent,
  type ClipboardEvent,
  type ChangeEvent,
} from 'react';
import { cn } from '@/lib/cn';

const DEFAULT_CELL_COUNT = 6;

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  hasError?: boolean;
  className?: string;
}

export interface OtpInputHandle {
  focus: () => void;
}

const OtpInput = forwardRef<OtpInputHandle, OtpInputProps>(function OtpInput(
  { value, onChange, length = DEFAULT_CELL_COUNT, disabled, hasError, className },
  ref,
) {
  const CELL_COUNT = length;
  const cells = useRef<(HTMLInputElement | null)[]>([]);
  const chars = value.padEnd(CELL_COUNT, '').slice(0, CELL_COUNT).split('');

  useImperativeHandle(ref, () => ({
    focus: () => cells.current[0]?.focus(),
  }));

  function focusCell(idx: number) {
    if (idx >= 0 && idx < CELL_COUNT) {
      cells.current[idx]?.focus();
    }
  }

  function updateValue(idx: number, char: string) {
    const next = [...chars];
    next[idx] = char;
    onChange(next.join('').replace(/[^0-9]/g, ''));
  }

  function handleChange(idx: number, e: ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '');
    if (!raw) return;
    const char = raw[raw.length - 1];
    updateValue(idx, char);
    if (idx < CELL_COUNT - 1) focusCell(idx + 1);
  }

  function handleKeyDown(idx: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (chars[idx]) {
        updateValue(idx, '');
      } else if (idx > 0) {
        updateValue(idx - 1, '');
        focusCell(idx - 1);
      }
    }
    if (e.key === 'ArrowLeft' && idx > 0) {
      e.preventDefault();
      focusCell(idx - 1);
    }
    if (e.key === 'ArrowRight' && idx < CELL_COUNT - 1) {
      e.preventDefault();
      focusCell(idx + 1);
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CELL_COUNT);
    if (!pasted) return;
    onChange(pasted);
    focusCell(Math.min(pasted.length, CELL_COUNT - 1));
  }

  return (
    <div className={cn('flex justify-center gap-2', className)}>
      {Array.from({ length: CELL_COUNT }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            cells.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={2}
          value={chars[i] || ''}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          disabled={disabled}
          className={cn(
            'h-[52px] w-[44px] rounded-[var(--r-md)] border-[1.5px] bg-bg-elev text-center text-[22px] font-bold outline-none transition-[border,box-shadow]',
            chars[i] ? 'border-primary' : 'border-border',
            hasError && 'border-danger bg-danger-soft',
            'focus:border-primary focus:shadow-[var(--focus-ring)]',
            'disabled:cursor-not-allowed disabled:bg-bg-sunken disabled:text-text-3',
          )}
        />
      ))}
    </div>
  );
});

export { OtpInput };
