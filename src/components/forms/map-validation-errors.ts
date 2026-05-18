import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { AppError } from '@/api/errors';
import { isAppError } from '@/lib/error-map';

/**
 * Maps a 422 validation AppError (nest `message[]` in `details`) to RHF `setError`
 * calls per field. Each message is expected in format `"fieldName: error text"` or
 * just `"error text"` (set on root).
 *
 * Returns `true` if any field errors were set, `false` otherwise (caller should show
 * a generic toast for non-field errors).
 */
export function mapValidationErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
): boolean {
  if (!isAppError(error)) return false;

  const appError = error as AppError;
  if (appError.code !== 'validation_error' || !Array.isArray(appError.details)) return false;

  const messages = appError.details as string[];
  let fieldErrorsSet = false;

  for (const msg of messages) {
    const colonIdx = msg.indexOf(':');
    if (colonIdx > 0 && colonIdx < 40) {
      const candidate = msg.slice(0, colonIdx).trim();
      const text = msg.slice(colonIdx + 1).trim();
      if (/^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(candidate)) {
        setError(candidate as Path<T>, { type: 'server', message: text });
        fieldErrorsSet = true;
        continue;
      }
    }
    setError('root' as Path<T>, { type: 'server', message: msg });
    fieldErrorsSet = true;
  }

  return fieldErrorsSet;
}
