import { describe, expect, it } from 'vitest';
import { StaffMemberDtoSchema, StaffRoleEnum } from './staff';

describe('StaffMemberDtoSchema', () => {
  const validStaff = {
    id: 'stf-1234-5678-abcd-1234567890ab',
    kindergarten_id: '7c2c2b6a-1a2b-4c3d-9e8f-0a1b2c3d4e5f',
    user_id: 'usr-1111-2222-3333-444455556666',
    full_name: 'Айша Нурланова',
    phone: '+77011112233',
    role: 'mentor',
    specialist_type: null,
    is_active: true,
    hired_at: '2026-01-01',
    fired_at: null,
    archived_at: null,
    created_at: '2026-04-24T10:00:00.000Z',
    updated_at: '2026-04-24T10:00:00.000Z',
  };

  it('parses a valid active mentor', () => {
    const result = StaffMemberDtoSchema.parse(validStaff);
    expect(result.id).toBe(validStaff.id);
    expect(result.role).toBe('mentor');
    expect(result.is_active).toBe(true);
    expect(result.specialist_type).toBeNull();
    expect(result.fired_at).toBeNull();
  });

  it('parses a specialist with specialist_type', () => {
    const staff = {
      ...validStaff,
      role: 'specialist',
      specialist_type: 'psychologist',
    };
    const result = StaffMemberDtoSchema.parse(staff);
    expect(result.role).toBe('specialist');
    expect(result.specialist_type).toBe('psychologist');
  });

  it('parses nullable full_name and phone', () => {
    const staff = {
      ...validStaff,
      full_name: null,
      phone: null,
    };
    const result = StaffMemberDtoSchema.parse(staff);
    expect(result.full_name).toBeNull();
    expect(result.phone).toBeNull();
  });

  it('parses a deactivated staff member', () => {
    const staff = {
      ...validStaff,
      is_active: false,
      fired_at: '2026-10-01',
    };
    const result = StaffMemberDtoSchema.parse(staff);
    expect(result.is_active).toBe(false);
    expect(result.fired_at).toBe('2026-10-01');
  });

  it('parses an archived staff member', () => {
    const staff = {
      ...validStaff,
      is_active: false,
      archived_at: '2026-12-01T00:00:00.000Z',
    };
    const result = StaffMemberDtoSchema.parse(staff);
    expect(result.archived_at).toBe('2026-12-01T00:00:00.000Z');
  });

  it('parses all role values', () => {
    for (const role of ['admin', 'mentor', 'specialist', 'reception'] as const) {
      const staff = { ...validStaff, role };
      expect(StaffMemberDtoSchema.parse(staff).role).toBe(role);
    }
  });

  it('rejects unknown role', () => {
    const staff = { ...validStaff, role: 'manager' };
    expect(() => StaffMemberDtoSchema.parse(staff)).toThrow();
  });

  it('rejects missing required fields', () => {
    const { id: _id, ...noId } = validStaff;
    void _id;
    expect(() => StaffMemberDtoSchema.parse(noId)).toThrow();
  });
});

describe('StaffRoleEnum', () => {
  it('accepts valid roles', () => {
    expect(StaffRoleEnum.parse('admin')).toBe('admin');
    expect(StaffRoleEnum.parse('mentor')).toBe('mentor');
    expect(StaffRoleEnum.parse('specialist')).toBe('specialist');
    expect(StaffRoleEnum.parse('reception')).toBe('reception');
  });

  it('rejects invalid role', () => {
    expect(() => StaffRoleEnum.parse('manager')).toThrow();
  });
});

// specialist_type is now a free-form dictionary CODE (N12), validated by the backend —
// no frontend enum. The DTO accepts any string (asserted in StaffMemberDtoSchema tests above).
