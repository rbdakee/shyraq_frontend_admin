export class AppError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: unknown;

  constructor(code: string, status: number, details?: unknown) {
    super(code);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

// WHY three shapes: backend has more than one 422/error envelope in the wild.
//  (a) domain envelope {error,message?,details?} — stable error code (DomainErrorFilter).
//  (b) legacy nest-422 {statusCode,message[],error} — class-validator via default pipe.
//  (c) global ValidationPipe {status,errors:{field: msg | nested}} — the live shape emitted
//      by src/utils/validation-options.ts on the backend for EVERY DTO validation failure.
// All three must round-trip through AppError so callers only handle one type. Missing (c)
// was the cause of every 422 surfacing as the generic "unknown_error" toast.
export function parseApiError(data: unknown, status: number): AppError {
  if (typeof data !== 'object' || data === null) {
    return new AppError('unknown_error', status);
  }

  const d = data as Record<string, unknown>;

  // Shape (b): nest-422 {statusCode:number, message:string[], error:string}
  if (typeof d.statusCode === 'number' && Array.isArray(d.message) && typeof d.error === 'string') {
    return new AppError('validation_error', status, d.message as string[]);
  }

  // Shape (c): global ValidationPipe {status:number, errors:{field: string | nested object}}.
  // Flatten to the same string[] of "path: message" that shape (b) yields so downstream
  // mapValidationErrors handles both identically.
  if (
    typeof d.status === 'number' &&
    d.errors != null &&
    typeof d.errors === 'object' &&
    !Array.isArray(d.errors)
  ) {
    return new AppError(
      'validation_error',
      status,
      flattenValidationErrors(d.errors as Record<string, unknown>),
    );
  }

  // Shape (d): HttpException thrown with an object body {code:'logo_required'} — no `error` key.
  if (typeof d.code === 'string' && SNAKE_CODE.test(d.code)) {
    return new AppError(d.code, status, d.details);
  }

  // Shape (a): domain envelope {error:string, message?:string, details?:unknown}.
  // Nest built-ins (`new ForbiddenException('insufficient_role')`) put the real code in
  // `message` and the HTTP reason phrase ("Forbidden") in `error` — prefer the code.
  if (typeof d.error === 'string') {
    if (!SNAKE_CODE.test(d.error) && typeof d.message === 'string' && SNAKE_CODE.test(d.message)) {
      return new AppError(d.message, status, d.details);
    }
    return new AppError(d.error, status, d.details);
  }

  return new AppError('unknown_error', status);
}

const SNAKE_CODE = /^[a-z][a-z0-9_]*$/;

// Flatten the nested {field: msg | {sub: msg}} error map into "path: message" strings.
// Nested fields (e.g. i18n {ru,kk}) become dot-paths like "notification_title.ru".
function flattenValidationErrors(errors: Record<string, unknown>, prefix = ''): string[] {
  const out: string[] = [];
  for (const [key, value] of Object.entries(errors)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value != null && typeof value === 'object' && !Array.isArray(value)) {
      out.push(...flattenValidationErrors(value as Record<string, unknown>, path));
    } else {
      out.push(`${path}: ${String(value)}`);
    }
  }
  return out;
}
