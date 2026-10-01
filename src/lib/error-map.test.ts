import { describe, it, expect } from 'vitest';
import { toI18nKey, KNOWN_ERROR_CODES } from './error-map';
import { AppError, parseApiError } from '@/api/errors';

describe('toI18nKey', () => {
  it('maps AppError code to errors namespace', () => {
    expect(toI18nKey(new AppError('child_not_found', 404))).toBe('errors:child_not_found');
  });

  it('falls back for plain Error', () => {
    expect(toI18nKey(new Error('x'))).toBe('errors:unknown_error');
  });

  it('falls back for undefined', () => {
    expect(toI18nKey(undefined)).toBe('errors:unknown_error');
  });

  it('falls back for arbitrary object without AppError', () => {
    expect(toI18nKey({ code: 'something' })).toBe('errors:unknown_error');
  });
});

describe('parseApiError', () => {
  it('parses domain envelope: code + status + details preserved', () => {
    const err = parseApiError({ error: 'child_not_found', details: { id: 'abc' } }, 404);
    expect(err).toBeInstanceOf(AppError);
    expect(err.code).toBe('child_not_found');
    expect(err.status).toBe(404);
    expect(err.details).toEqual({ id: 'abc' });
  });

  it('parses nest-422: code becomes validation_error, details = message array', () => {
    const err = parseApiError(
      {
        statusCode: 422,
        error: 'Unprocessable Entity',
        message: ['name should not be empty', 'phone invalid'],
      },
      422,
    );
    expect(err).toBeInstanceOf(AppError);
    expect(err.code).toBe('validation_error');
    expect(err.status).toBe(422);
    expect(err.details).toEqual(['name should not be empty', 'phone invalid']);
  });

  it('falls back to unknown_error for garbage input', () => {
    const err = parseApiError('garbage', 500);
    expect(err.code).toBe('unknown_error');
    expect(err.status).toBe(500);
  });

  it('falls back to unknown_error for null', () => {
    expect(parseApiError(null, 500).code).toBe('unknown_error');
  });

  it('falls back to unknown_error for object with no error field', () => {
    expect(parseApiError({ foo: 'bar' }, 400).code).toBe('unknown_error');
  });
});

describe('KNOWN_ERROR_CODES', () => {
  it('includes validation_error and unknown_error', () => {
    expect(KNOWN_ERROR_CODES).toContain('validation_error');
    expect(KNOWN_ERROR_CODES).toContain('unknown_error');
  });

  it('includes documented child domain codes (HANDOFF §5)', () => {
    expect(KNOWN_ERROR_CODES).toContain('child_not_found');
    expect(KNOWN_ERROR_CODES).toContain('archived_child_not_transferable');
    expect(KNOWN_ERROR_CODES).toContain('child_already_archived');
  });

  it('includes staff/group codes (HANDOFF §7–§8)', () => {
    expect(KNOWN_ERROR_CODES).toContain('staff_phone_conflict');
    expect(KNOWN_ERROR_CODES).toContain('slot_time_conflict');
  });

  it('includes parent request codes (HANDOFF §19)', () => {
    expect(KNOWN_ERROR_CODES).toContain('parent_request_already_processed');
    expect(KNOWN_ERROR_CODES).toContain('parent_request_cursor_invalid');
  });

  it('includes content codes (HANDOFF §12)', () => {
    expect(KNOWN_ERROR_CODES).toContain('content_target_invalid');
    expect(KNOWN_ERROR_CODES).toContain('content_post_status_invalid');
  });

  it('includes location_in_use (HANDOFF §9)', () => {
    expect(KNOWN_ERROR_CODES).toContain('location_in_use');
  });

  it('includes template_has_entries (HANDOFF §21)', () => {
    expect(KNOWN_ERROR_CODES).toContain('template_has_entries');
  });
});

describe('toI18nKey fallbacks', () => {
  it('keeps a translated backend code', () => {
    expect(toI18nKey(new AppError('optimistic_lock_conflict', 409))).toBe(
      'errors:optimistic_lock_conflict',
    );
  });

  it('degrades an untranslated code by HTTP status instead of leaking it', () => {
    expect(toI18nKey(new AppError('Forbidden', 403))).toBe('errors:forbidden');
    expect(toI18nKey(new AppError('no_such_code_xyz', 404))).toBe('errors:not_found');
    expect(toI18nKey(new AppError('no_such_code_xyz', 500))).toBe('errors:server_error');
    expect(toI18nKey(new AppError('no_such_code_xyz', 409))).toBe('errors:unknown_error');
  });

  it('maps a ky timeout to request_timeout', () => {
    const err = new Error('timed out');
    err.name = 'TimeoutError';
    expect(toI18nKey(err)).toBe('errors:request_timeout');
  });
});
