import { describe, it, expect } from 'vitest';
import { AppError, parseApiError } from './errors';

describe('parseApiError', () => {
  it('returns unknown_error for non-object payloads', () => {
    expect(parseApiError(null, 500)).toMatchObject({ code: 'unknown_error', status: 500 });
    expect(parseApiError('boom', 500)).toMatchObject({ code: 'unknown_error', status: 500 });
  });

  it('parses shape (a) domain envelope {error, details}', () => {
    const err = parseApiError({ error: 'child_not_found', details: { id: '1' } }, 404);
    expect(err).toBeInstanceOf(AppError);
    expect(err.code).toBe('child_not_found');
    expect(err.status).toBe(404);
    expect(err.details).toEqual({ id: '1' });
  });

  it('parses shape (b) legacy nest-422 {statusCode, message[], error}', () => {
    const err = parseApiError(
      { statusCode: 422, error: 'Unprocessable Entity', message: ['amount: must be > 0'] },
      422,
    );
    expect(err.code).toBe('validation_error');
    expect(err.details).toEqual(['amount: must be > 0']);
  });

  it('parses shape (c) global ValidationPipe {status, errors} — flat fields', () => {
    const err = parseApiError(
      { status: 422, errors: { conditions: 'custom_discount_conditions_invalid' } },
      422,
    );
    expect(err.code).toBe('validation_error');
    expect(err.status).toBe(422);
    expect(err.details).toEqual(['conditions: custom_discount_conditions_invalid']);
  });

  it('flattens nested ValidationPipe errors to dot-path strings', () => {
    const err = parseApiError(
      {
        status: 422,
        errors: {
          notification_title: { ru: 'ru should not be empty', kk: 'kk should not be empty' },
          notification_body: { ru: 'ru should not be empty' },
        },
      },
      422,
    );
    expect(err.code).toBe('validation_error');
    expect(err.details).toEqual([
      'notification_title.ru: ru should not be empty',
      'notification_title.kk: kk should not be empty',
      'notification_body.ru: ru should not be empty',
    ]);
  });

  it('does not misclassify shape (c) as the domain envelope', () => {
    // {status, errors} has no `error` string key, so it must not fall through to shape (a).
    const err = parseApiError({ status: 422, errors: { amount: 'must be > 0' } }, 422);
    expect(err.code).toBe('validation_error');
  });

  it('falls back to unknown_error for an unrecognised object shape', () => {
    expect(parseApiError({ foo: 'bar' }, 400)).toMatchObject({
      code: 'unknown_error',
      status: 400,
    });
  });
});
