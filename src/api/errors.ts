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

// WHY two shapes: backend uses stable envelope {error,message?,details?} for domain
// errors, but NestJS class-validator 422s emit {statusCode,message[],error} with no
// stable error code. Both must round-trip through AppError so callers only handle one type.
export function parseApiError(data: unknown, status: number): AppError {
  if (typeof data !== 'object' || data === null) {
    return new AppError('unknown_error', status);
  }

  const d = data as Record<string, unknown>;

  // Shape (b): nest-422 {statusCode:number, message:string[], error:string}
  if (typeof d.statusCode === 'number' && Array.isArray(d.message) && typeof d.error === 'string') {
    return new AppError('validation_error', status, d.message as string[]);
  }

  // Shape (a): domain envelope {error:string, message?:string, details?:unknown}
  if (typeof d.error === 'string') {
    return new AppError(d.error, status, d.details);
  }

  return new AppError('unknown_error', status);
}
