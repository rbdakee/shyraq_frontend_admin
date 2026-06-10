import { describe, expect, it } from 'vitest';
import { ChildDtoSchema, GuardianDtoSchema } from './children';

describe('ChildDtoSchema', () => {
  const validChild = {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    kindergarten_id: '7c2c2b6a-1a2b-4c3d-9e8f-0a1b2c3d4e5f',
    iin: null,
    full_name: 'Айгерим Нурсултанкызы',
    date_of_birth: '2021-09-15',
    gender: 'female',
    photo_url: null,
    status: 'card_created',
    current_group_id: null,
    enrollment_date: null,
    archived_at: null,
    archive_reason: null,
    medical_notes: null,
    allergy_notes: 'Peanut allergy.',
    created_at: '2026-04-26T10:00:00.000Z',
    updated_at: '2026-04-26T10:00:00.000Z',
  };

  it('parses a valid child with nullable fields as null', () => {
    const result = ChildDtoSchema.parse(validChild);
    expect(result.id).toBe(validChild.id);
    expect(result.iin).toBeNull();
    expect(result.gender).toBe('female');
    expect(result.status).toBe('card_created');
  });

  it('parses a fully populated child', () => {
    const child = {
      ...validChild,
      iin: '040315500123',
      gender: 'male',
      photo_url: 'https://cdn.shyraq.kz/photos/test.jpg',
      status: 'active',
      current_group_id: 'b2c3d4e5-1234-5678-abcd-1234567890ab',
      enrollment_date: '2026-01-15',
      medical_notes: 'No chronic conditions',
    };
    const result = ChildDtoSchema.parse(child);
    expect(result.iin).toBe('040315500123');
    expect(result.current_group_id).toBe('b2c3d4e5-1234-5678-abcd-1234567890ab');
  });

  it('parses archived status with archive fields', () => {
    const child = {
      ...validChild,
      status: 'archived',
      archived_at: '2026-05-18T10:00:00.000Z',
      archive_reason: 'Family relocated',
    };
    const result = ChildDtoSchema.parse(child);
    expect(result.status).toBe('archived');
    expect(result.archived_at).toBe('2026-05-18T10:00:00.000Z');
    expect(result.archive_reason).toBe('Family relocated');
  });

  it('rejects unknown status', () => {
    const child = { ...validChild, status: 'unknown_status' };
    expect(() => ChildDtoSchema.parse(child)).toThrow();
  });

  it('rejects missing required fields', () => {
    const { id: _id, ...noId } = validChild;
    void _id;
    expect(() => ChildDtoSchema.parse(noId)).toThrow();
  });
});

describe('GuardianDtoSchema', () => {
  const validGuardian = {
    id: '66666666-6666-6666-6666-666666666666',
    kindergarten_id: '7c2c2b6a-1a2b-4c3d-9e8f-0a1b2c3d4e5f',
    child_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    user_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    user_full_name: 'Айгерим Нурсултанкызы',
    user_phone: '+77011223344',
    role: 'primary',
    status: 'approved',
    has_approval_rights: false,
    can_pickup: true,
    permissions: { view_cctv: false },
    approved_by: null,
    approved_at: null,
    revoked_by: null,
    revoked_at: null,
    permissions_updated_by: null,
    permissions_updated_at: null,
    created_at: '2026-04-26T10:00:00.000Z',
    updated_at: '2026-04-26T10:00:00.000Z',
  };

  it('parses a valid guardian', () => {
    const result = GuardianDtoSchema.parse(validGuardian);
    expect(result.role).toBe('primary');
    expect(result.status).toBe('approved');
    expect(result.can_pickup).toBe(true);
    expect(result.permissions).toEqual({ view_cctv: false });
  });

  it('parses all guardian statuses', () => {
    for (const status of ['pending_approval', 'approved', 'rejected', 'revoked'] as const) {
      const guardian = { ...validGuardian, status };
      expect(GuardianDtoSchema.parse(guardian).status).toBe(status);
    }
  });

  it('parses all guardian roles', () => {
    for (const role of ['primary', 'secondary', 'nanny'] as const) {
      const guardian = { ...validGuardian, role };
      expect(GuardianDtoSchema.parse(guardian).role).toBe(role);
    }
  });

  it('accepts null user_full_name / user_phone (unresolved profile)', () => {
    const guardian = { ...validGuardian, user_full_name: null, user_phone: null };
    const result = GuardianDtoSchema.parse(guardian);
    expect(result.user_full_name).toBeNull();
    expect(result.user_phone).toBeNull();
  });
});
