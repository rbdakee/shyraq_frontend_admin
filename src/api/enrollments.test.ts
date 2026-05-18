import { describe, expect, it } from 'vitest';
import {
  EnrollmentDtoSchema,
  EnrollmentStatusLogDtoSchema,
  TransitionEnrollmentResponseSchema,
} from './enrollments';

describe('EnrollmentDtoSchema', () => {
  const validEnrollment = {
    id: 'e1a2b3c4-0000-0000-0000-000000000001',
    kindergartenId: 'f1a2b3c4-0000-0000-0000-000000000001',
    childId: null,
    contactName: 'Айгуль Серикова',
    contactPhone: '+77011112233',
    childName: 'Алия Серикова',
    childDob: '2021-08-15',
    childIin: null,
    status: 'new',
    source: 'instagram_ad',
    notes: null,
    assignedTo: null,
    statusChangedAt: '2026-04-30T10:00:00.000Z',
    createdAt: '2026-04-30T10:00:00.000Z',
    updatedAt: '2026-04-30T10:00:00.000Z',
  };

  it('parses a valid enrollment with nullable fields as null', () => {
    const result = EnrollmentDtoSchema.parse(validEnrollment);
    expect(result.id).toBe(validEnrollment.id);
    expect(result.childId).toBeNull();
    expect(result.childIin).toBeNull();
    expect(result.notes).toBeNull();
    expect(result.assignedTo).toBeNull();
    expect(result.status).toBe('new');
  });

  it('parses a fully populated enrollment', () => {
    const enrollment = {
      ...validEnrollment,
      childId: 'child-uuid-123',
      childIin: '210815500123',
      status: 'card_created',
      notes: 'Хочет с октября',
      assignedTo: 'staff-uuid-456',
    };
    const result = EnrollmentDtoSchema.parse(enrollment);
    expect(result.childId).toBe('child-uuid-123');
    expect(result.childIin).toBe('210815500123');
    expect(result.status).toBe('card_created');
    expect(result.assignedTo).toBe('staff-uuid-456');
  });

  it('parses all enrollment statuses', () => {
    for (const status of [
      'new',
      'in_processing',
      'waitlist',
      'card_created',
      'cancelled',
      'archive',
    ] as const) {
      const enrollment = { ...validEnrollment, status };
      expect(EnrollmentDtoSchema.parse(enrollment).status).toBe(status);
    }
  });

  it('rejects unknown status', () => {
    const enrollment = { ...validEnrollment, status: 'unknown_status' };
    expect(() => EnrollmentDtoSchema.parse(enrollment)).toThrow();
  });

  it('rejects missing required fields', () => {
    const { id: _id, ...noId } = validEnrollment;
    void _id;
    expect(() => EnrollmentDtoSchema.parse(noId)).toThrow();
  });

  it('rejects missing contactName', () => {
    const { contactName: _cn, ...noCn } = validEnrollment;
    void _cn;
    expect(() => EnrollmentDtoSchema.parse(noCn)).toThrow();
  });
});

describe('EnrollmentStatusLogDtoSchema', () => {
  const validLog = {
    id: 'a1b2c3d4-0000-0000-0000-000000000001',
    enrollmentId: 'e1a2b3c4-0000-0000-0000-000000000001',
    kindergartenId: 'f1a2b3c4-0000-0000-0000-000000000001',
    fromStatus: null,
    toStatus: 'new',
    changedBy: 'b2a1c0d9-0000-0000-0000-000000000001',
    comment: null,
    createdAt: '2026-04-30T10:00:00.000Z',
  };

  it('parses initial creation log entry with null fromStatus', () => {
    const result = EnrollmentStatusLogDtoSchema.parse(validLog);
    expect(result.fromStatus).toBeNull();
    expect(result.toStatus).toBe('new');
    expect(result.comment).toBeNull();
  });

  it('parses a transition log entry', () => {
    const log = {
      ...validLog,
      fromStatus: 'new',
      toStatus: 'in_processing',
      comment: 'Перезвонила, договорились на встречу',
    };
    const result = EnrollmentStatusLogDtoSchema.parse(log);
    expect(result.fromStatus).toBe('new');
    expect(result.toStatus).toBe('in_processing');
    expect(result.comment).toBe('Перезвонила, договорились на встречу');
  });

  it('rejects invalid toStatus', () => {
    const log = { ...validLog, toStatus: 'invalid' };
    expect(() => EnrollmentStatusLogDtoSchema.parse(log)).toThrow();
  });

  it('rejects missing required fields', () => {
    const { changedBy: _cb, ...noChangedBy } = validLog;
    void _cb;
    expect(() => EnrollmentStatusLogDtoSchema.parse(noChangedBy)).toThrow();
  });
});

describe('TransitionEnrollmentResponseSchema', () => {
  const baseEnrollment = {
    id: 'e1a2b3c4-0000-0000-0000-000000000001',
    kindergartenId: 'f1a2b3c4-0000-0000-0000-000000000001',
    childId: 'c1a2b3c4-0000-0000-0000-000000000001',
    contactName: 'Айгуль Серикова',
    contactPhone: '+77011112233',
    childName: 'Алия Серикова',
    childDob: '2021-08-15',
    childIin: '210815500123',
    status: 'card_created',
    source: 'instagram_ad',
    notes: null,
    assignedTo: 'staff-uuid-456',
    statusChangedAt: '2026-04-30T10:00:00.000Z',
    createdAt: '2026-04-30T10:00:00.000Z',
    updatedAt: '2026-04-30T10:00:00.000Z',
  };

  it('parses card_created transition with child object', () => {
    const payload = {
      enrollment: baseEnrollment,
      child: {
        id: 'c1a2b3c4-0000-0000-0000-000000000001',
        kindergarten_id: 'f1a2b3c4-0000-0000-0000-000000000001',
        full_name: 'Алия Серикова',
        date_of_birth: '2021-08-15',
        iin: null,
        gender: null,
        photo_url: null,
        status: 'card_created',
        current_group_id: null,
        enrollment_date: null,
        archived_at: null,
        archive_reason: null,
        medical_notes: null,
        allergy_notes: null,
        created_at: '2026-04-30T10:00:00.000Z',
        updated_at: '2026-04-30T10:00:00.000Z',
      },
    };
    const result = TransitionEnrollmentResponseSchema.parse(payload);
    expect(result.child).not.toBeNull();
    expect(result.child?.id).toBe('c1a2b3c4-0000-0000-0000-000000000001');
    expect(result.enrollment.status).toBe('card_created');
  });

  it('parses non-card_created transition with child null', () => {
    const payload = {
      enrollment: { ...baseEnrollment, status: 'in_processing', childId: null },
      child: null,
    };
    const result = TransitionEnrollmentResponseSchema.parse(payload);
    expect(result.child).toBeNull();
    expect(result.enrollment.status).toBe('in_processing');
  });

  it('parses transition with child absent', () => {
    const payload = {
      enrollment: { ...baseEnrollment, status: 'waitlist', childId: null },
    };
    const result = TransitionEnrollmentResponseSchema.parse(payload);
    expect(result.child).toBeUndefined();
  });

  it('preserves extra child fields via passthrough', () => {
    const payload = {
      enrollment: baseEnrollment,
      child: {
        id: 'c1a2b3c4-0000-0000-0000-000000000001',
        kindergarten_id: 'f1a2b3c4-0000-0000-0000-000000000001',
        full_name: 'Алия Серикова',
        some_future_field: 42,
      },
    };
    const result = TransitionEnrollmentResponseSchema.parse(payload);
    expect(result.child?.id).toBe('c1a2b3c4-0000-0000-0000-000000000001');
    expect((result.child as Record<string, unknown>)['some_future_field']).toBe(42);
  });

  it('rejects child object without id', () => {
    const payload = {
      enrollment: baseEnrollment,
      child: { full_name: 'Алия Серикова' },
    };
    expect(() => TransitionEnrollmentResponseSchema.parse(payload)).toThrow();
  });
});
