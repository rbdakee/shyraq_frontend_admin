import { describe, it, expect } from 'vitest';
import {
  isAssignmentActiveOn,
  resolveActiveAssignment,
  effectiveMonthlyAmount,
  firstDayOfNextMonthIso,
  addDaysIso,
} from './tariff';

const mk = (
  valid_from: string,
  valid_until: string | null,
  custom_amount: number | null = null,
) => ({
  custom_amount,
  valid_from,
  valid_until,
});

describe('isAssignmentActiveOn', () => {
  it('is active within an open-ended window', () => {
    expect(isAssignmentActiveOn(mk('2026-06-01', null), '2026-06-10')).toBe(true);
    expect(isAssignmentActiveOn(mk('2026-06-01', null), '2026-05-31')).toBe(false);
  });

  it('respects the upper bound inclusively', () => {
    const a = mk('2026-06-01', '2026-06-30');
    expect(isAssignmentActiveOn(a, '2026-06-30')).toBe(true);
    expect(isAssignmentActiveOn(a, '2026-07-01')).toBe(false);
  });

  it('ignores a time component on the stored date', () => {
    expect(isAssignmentActiveOn(mk('2026-06-01T00:00:00Z', null), '2026-06-01')).toBe(true);
  });
});

describe('resolveActiveAssignment', () => {
  it('returns null when nothing covers the date', () => {
    expect(resolveActiveAssignment([mk('2026-07-01', null)], '2026-06-10')).toBeNull();
  });

  it('picks the most recently started among overlaps', () => {
    const older = mk('2026-01-01', null);
    const newer = mk('2026-06-01', null);
    expect(resolveActiveAssignment([older, newer], '2026-06-10')).toBe(newer);
  });
});

describe('effectiveMonthlyAmount', () => {
  it('uses the plan amount when no custom amount', () => {
    expect(effectiveMonthlyAmount(mk('2026-06-01', null, null), { amount: 120000 })).toBe(120000);
  });

  it('custom amount overrides the plan amount', () => {
    expect(effectiveMonthlyAmount(mk('2026-06-01', null, 80000), { amount: 120000 })).toBe(80000);
  });

  it('treats a zero custom amount as a real override (not falsy)', () => {
    expect(effectiveMonthlyAmount(mk('2026-06-01', null, 0), { amount: 120000 })).toBe(0);
  });
});

describe('addDaysIso', () => {
  it('subtracts a day (replace flow: close the day before)', () => {
    expect(addDaysIso('2026-06-10', -1)).toBe('2026-06-09');
  });

  it('rolls back across a month boundary', () => {
    expect(addDaysIso('2026-07-01', -1)).toBe('2026-06-30');
  });

  it('rolls back across a year boundary', () => {
    expect(addDaysIso('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('adds days forward', () => {
    expect(addDaysIso('2026-06-10', 5)).toBe('2026-06-15');
  });

  it('ignores a time component on the input', () => {
    expect(addDaysIso('2026-06-10T09:30:00Z', -1)).toBe('2026-06-09');
  });
});

describe('firstDayOfNextMonthIso', () => {
  it('advances within a year', () => {
    expect(firstDayOfNextMonthIso('2026-06-10')).toBe('2026-07-01');
  });

  it('rolls over December to January of next year', () => {
    expect(firstDayOfNextMonthIso('2026-12-15')).toBe('2027-01-01');
  });
});
