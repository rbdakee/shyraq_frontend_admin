import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { AttendanceEventResponseDtoSchema, DailyStatusResponseDtoSchema } from './attendance';

describe('AttendanceEventResponseDtoSchema', () => {
  const validEvent = {
    id: 'e1111111-1111-1111-1111-111111111111',
    kindergartenId: 'f1a2b3c4-0000-0000-0000-000000000001',
    childId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    eventType: 'check_in',
    method: 'manual',
    recordedBy: null,
    pickupUserId: null,
    pickupRequestId: null,
    notes: null,
    recordedAt: '2026-05-01T09:00:00.000Z',
    createdAt: '2026-05-01T09:00:01.234Z',
  };

  it('parses a valid event', () => {
    const result = AttendanceEventResponseDtoSchema.parse(validEvent);
    expect(result.id).toBe(validEvent.id);
    expect(result.eventType).toBe('check_in');
    expect(result.method).toBe('manual');
  });

  it('parses bare array of events', () => {
    const arr = [
      validEvent,
      {
        ...validEvent,
        id: 'e2222222-2222-2222-2222-222222222222',
        eventType: 'check_out',
        method: 'otp_pickup',
      },
    ];
    const result = z.array(AttendanceEventResponseDtoSchema).parse(arr);
    expect(result).toHaveLength(2);
    expect(result[1].eventType).toBe('check_out');
  });

  it('accepts nullable string fields as null', () => {
    const result = AttendanceEventResponseDtoSchema.parse({
      ...validEvent,
      recordedBy: null,
      pickupUserId: null,
      notes: null,
    });
    expect(result.recordedBy).toBeNull();
    expect(result.pickupUserId).toBeNull();
    expect(result.notes).toBeNull();
  });

  it('accepts nullable string fields with actual values', () => {
    const result = AttendanceEventResponseDtoSchema.parse({
      ...validEvent,
      recordedBy: 'staff-id-1',
      pickupUserId: 'user-id-2',
      notes: 'Test note',
    });
    expect(result.recordedBy).toBe('staff-id-1');
    expect(result.pickupUserId).toBe('user-id-2');
    expect(result.notes).toBe('Test note');
  });

  it('rejects invalid eventType', () => {
    expect(() =>
      AttendanceEventResponseDtoSchema.parse({ ...validEvent, eventType: 'invalid' }),
    ).toThrow();
  });

  it('rejects invalid method', () => {
    expect(() =>
      AttendanceEventResponseDtoSchema.parse({ ...validEvent, method: 'invalid' }),
    ).toThrow();
  });

  it('parses empty bare array', () => {
    const result = z.array(AttendanceEventResponseDtoSchema).parse([]);
    expect(result).toEqual([]);
  });
});

describe('DailyStatusResponseDtoSchema', () => {
  const validStatus = {
    id: 'd1111111-1111-1111-1111-111111111111',
    kindergartenId: 'f1a2b3c4-0000-0000-0000-000000000001',
    childId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    date: '2026-05-01',
    status: 'present',
    note: null,
    setBy: null,
    updatedAt: '2026-05-01T09:00:00.000Z',
  };

  it('parses a valid daily status', () => {
    const result = DailyStatusResponseDtoSchema.parse(validStatus);
    expect(result.status).toBe('present');
    expect(result.date).toBe('2026-05-01');
  });

  it('parses bare array of daily statuses', () => {
    const arr = [
      validStatus,
      { ...validStatus, id: 'd2222222-2222-2222-2222-222222222222', status: 'sick', note: 'Fever' },
    ];
    const result = z.array(DailyStatusResponseDtoSchema).parse(arr);
    expect(result).toHaveLength(2);
    expect(result[1].status).toBe('sick');
    expect(result[1].note).toBe('Fever');
  });

  it('accepts all valid intraday statuses', () => {
    const statuses = ['present', 'absent', 'sick', 'late', 'early_pickup', 'on_vacation'] as const;
    for (const status of statuses) {
      const result = DailyStatusResponseDtoSchema.parse({ ...validStatus, status });
      expect(result.status).toBe(status);
    }
  });

  it('rejects invalid status', () => {
    expect(() =>
      DailyStatusResponseDtoSchema.parse({ ...validStatus, status: 'unknown' }),
    ).toThrow();
  });

  it('handles nullable note and setBy', () => {
    const result = DailyStatusResponseDtoSchema.parse({
      ...validStatus,
      note: 'Sick call from parent',
      setBy: 'staff-id-1',
    });
    expect(result.note).toBe('Sick call from parent');
    expect(result.setBy).toBe('staff-id-1');
  });
});
