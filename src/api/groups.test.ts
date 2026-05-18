import { describe, expect, it } from 'vitest';
import { GroupDtoSchema, GroupMentorDtoSchema } from './groups';

describe('GroupDtoSchema', () => {
  const validGroup = {
    id: 'b2c3d4e5-1234-5678-abcd-1234567890ab',
    kindergarten_id: '7c2c2b6a-1a2b-4c3d-9e8f-0a1b2c3d4e5f',
    name: 'Sunshine',
    capacity: 20,
    age_range_min: 12,
    age_range_max: 36,
    current_location_id: 'a1b2c3d4-1234-5678-abcd-1234567890ab',
    archived_at: null,
    created_at: '2026-04-24T10:00:00.000Z',
    updated_at: '2026-04-24T10:00:00.000Z',
  };

  it('parses a valid group with all fields', () => {
    const result = GroupDtoSchema.parse(validGroup);
    expect(result.id).toBe(validGroup.id);
    expect(result.name).toBe('Sunshine');
    expect(result.capacity).toBe(20);
    expect(result.age_range_min).toBe(12);
    expect(result.age_range_max).toBe(36);
  });

  it('parses a group with nullable fields as null', () => {
    const group = {
      ...validGroup,
      age_range_min: null,
      age_range_max: null,
      current_location_id: null,
    };
    const result = GroupDtoSchema.parse(group);
    expect(result.age_range_min).toBeNull();
    expect(result.age_range_max).toBeNull();
    expect(result.current_location_id).toBeNull();
  });

  it('parses an archived group', () => {
    const group = {
      ...validGroup,
      archived_at: '2026-05-18T10:00:00.000Z',
    };
    const result = GroupDtoSchema.parse(group);
    expect(result.archived_at).toBe('2026-05-18T10:00:00.000Z');
  });

  it('rejects missing required fields', () => {
    const { name: _name, ...noName } = validGroup;
    void _name;
    expect(() => GroupDtoSchema.parse(noName)).toThrow();
  });

  it('rejects non-number capacity', () => {
    const group = { ...validGroup, capacity: 'twenty' };
    expect(() => GroupDtoSchema.parse(group)).toThrow();
  });
});

describe('GroupMentorDtoSchema', () => {
  const validMentor = {
    id: 'gm-1234-5678-abcd-1234567890ab',
    kindergarten_id: '7c2c2b6a-1a2b-4c3d-9e8f-0a1b2c3d4e5f',
    group_id: 'b2c3d4e5-1234-5678-abcd-1234567890ab',
    staff_member_id: 'stf-1234-5678-abcd-1234567890ab',
    is_primary: true,
    assigned_at: '2026-01-15T10:00:00.000Z',
    unassigned_at: null,
    created_at: '2026-01-15T10:00:00.000Z',
  };

  it('parses a valid active mentor assignment', () => {
    const result = GroupMentorDtoSchema.parse(validMentor);
    expect(result.is_primary).toBe(true);
    expect(result.unassigned_at).toBeNull();
    expect(result.staff_member_id).toBe('stf-1234-5678-abcd-1234567890ab');
  });

  it('parses an unassigned mentor (with unassigned_at)', () => {
    const mentor = {
      ...validMentor,
      is_primary: false,
      unassigned_at: '2026-06-01T10:00:00.000Z',
    };
    const result = GroupMentorDtoSchema.parse(mentor);
    expect(result.is_primary).toBe(false);
    expect(result.unassigned_at).toBe('2026-06-01T10:00:00.000Z');
  });

  it('rejects missing required fields', () => {
    const { staff_member_id: _sm, ...noSm } = validMentor;
    void _sm;
    expect(() => GroupMentorDtoSchema.parse(noSm)).toThrow();
  });
});
