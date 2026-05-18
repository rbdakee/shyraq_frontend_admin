import { describe, expect, it } from 'vitest';
import { KindergartenMeSchema } from './kindergartens';

describe('KindergartenMeSchema', () => {
  const valid = {
    id: '7c2c2b6a-1a2b-4c3d-9e8f-0a1b2c3d4e5f',
    name: 'Солнышко',
    slug: 'solnyshko',
  };

  it('parses a valid kindergarten', () => {
    const result = KindergartenMeSchema.parse(valid);
    expect(result).toEqual(valid);
  });

  it('ignores extra fields the live KindergartenDto returns', () => {
    const result = KindergartenMeSchema.parse({
      ...valid,
      address: 'ул. Абая 1',
      phone: '+77001234567',
      plan: 'pro',
      settings: {},
      is_active: true,
      archived_at: null,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    });
    expect(result).toEqual(valid);
  });

  it('rejects missing required fields', () => {
    const { slug: _slug, ...noSlug } = valid;
    void _slug;
    expect(() => KindergartenMeSchema.parse(noSlug)).toThrow();
  });
});
