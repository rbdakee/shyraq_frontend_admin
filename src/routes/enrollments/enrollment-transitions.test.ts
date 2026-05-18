import { describe, it, expect } from 'vitest';
import { ALLOWED_TRANSITIONS } from './enrollment-transitions';

/**
 * Canonical state-machine from backend VO
 * (enrollment-status.vo.ts TRANSITIONS constant).
 * This spec-lock prevents silent FE drift.
 */
const BACKEND_CANONICAL: Record<string, readonly string[]> = {
  new: ['in_processing'],
  in_processing: ['waitlist', 'card_created', 'cancelled'],
  waitlist: ['in_processing'],
  card_created: ['archive'],
  cancelled: ['archive'],
  archive: [],
};

describe('ALLOWED_TRANSITIONS (enrollment state machine)', () => {
  it('has exactly the 6 canonical statuses', () => {
    expect(Object.keys(ALLOWED_TRANSITIONS).sort()).toEqual(Object.keys(BACKEND_CANONICAL).sort());
  });

  it.each(Object.entries(BACKEND_CANONICAL))(
    '%s transitions match backend VO exactly',
    (status, expectedTargets) => {
      expect([...ALLOWED_TRANSITIONS[status as keyof typeof ALLOWED_TRANSITIONS]]).toEqual([
        ...expectedTargets,
      ]);
    },
  );

  it('deep-equals the full canonical machine', () => {
    const feAsPlain: Record<string, readonly string[]> = {};
    for (const [k, v] of Object.entries(ALLOWED_TRANSITIONS)) {
      feAsPlain[k] = [...v];
    }
    const canonicalAsPlain: Record<string, readonly string[]> = {};
    for (const [k, v] of Object.entries(BACKEND_CANONICAL)) {
      canonicalAsPlain[k] = [...v];
    }
    expect(feAsPlain).toEqual(canonicalAsPlain);
  });
});
