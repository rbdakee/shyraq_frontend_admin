import { forwardRef, type ChangeEvent } from 'react';
import { Input } from '@/components/ui/input';
import { maskIin, formatIinDisplay } from '@/lib/format';

interface IinInputProps {
  value: string;
  onChange: (iin: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
  'aria-invalid'?: boolean;
}

// Thin controlled wrapper over the shared Input: identical styling (design 1:1).
// Mirrors PhoneInput — `value` is the canonical digit-only IIN; the field shows
// the grouped `123456 789012` mask, onChange emits the canonical digits back.
const IinInput = forwardRef<HTMLInputElement, IinInputProps>(function IinInput(
  { value, onChange, ...rest },
  ref,
) {
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    onChange(maskIin(e.target.value));
  }

  return (
    <Input
      ref={ref}
      value={formatIinDisplay(value)}
      onChange={handleChange}
      inputMode="numeric"
      autoComplete="off"
      {...rest}
    />
  );
});

export { IinInput };
