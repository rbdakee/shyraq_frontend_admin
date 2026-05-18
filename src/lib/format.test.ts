import { describe, it, expect } from 'vitest';
import {
  formatMoney,
  formatDateTime,
  formatDate,
  formatPhone,
  maskIin,
  formatIinDisplay,
} from './format';

describe('formatMoney', () => {
  it('formats 0 to "0 ₸"', () => {
    expect(formatMoney(0)).toBe('0 ₸');
  });

  it('formats 120000 to "120 000 ₸"', () => {
    expect(formatMoney(120000)).toBe('120 000 ₸');
  });

  it('formats 1234567 to "1 234 567 ₸"', () => {
    expect(formatMoney(1234567)).toBe('1 234 567 ₸');
  });

  it('formats negative amount correctly', () => {
    expect(formatMoney(-500)).toBe('-500 ₸');
  });

  it('uses regular spaces (U+0020), not non-breaking spaces', () => {
    const result = formatMoney(120000);
    const spaceCode = result.charCodeAt(3);
    expect(spaceCode).toBe(32);
  });
});

describe('formatDateTime', () => {
  // 2026-05-18T09:30:00Z → Asia/Almaty is UTC+5 → 14:30 local
  it('formats UTC instant to Asia/Almaty time correctly', () => {
    expect(formatDateTime('2026-05-18T09:30:00Z', 'Asia/Almaty')).toBe('18.05.2026 14:30');
  });

  // 2026-05-18T09:30:00Z → Europe/Paris is UTC+2 (CEST in May) → 11:30 local
  it('respects timeZone param — Europe/Paris gives different result', () => {
    expect(formatDateTime('2026-05-18T09:30:00Z', 'Europe/Paris')).toBe('18.05.2026 11:30');
  });

  it('accepts a Date object', () => {
    const d = new Date('2026-01-01T00:00:00Z');
    // Asia/Almaty UTC+5 → 05:00 on Jan 1
    expect(formatDateTime(d, 'Asia/Almaty')).toBe('01.01.2026 05:00');
  });

  it('zero-pads single-digit day and hour', () => {
    // 2026-05-07T02:05:00Z → Asia/Almaty 07:05
    expect(formatDateTime('2026-05-07T02:05:00Z', 'Asia/Almaty')).toBe('07.05.2026 07:05');
  });
});

describe('formatDate', () => {
  it('formats UTC instant to date in Asia/Almaty', () => {
    // 2026-05-18T20:00:00Z → next day in UTC+5 (01:00 May 19)
    expect(formatDate('2026-05-18T20:00:00Z', 'Asia/Almaty')).toBe('19.05.2026');
  });

  it('formats UTC instant to date in UTC', () => {
    expect(formatDate('2026-05-18T20:00:00Z', 'UTC')).toBe('18.05.2026');
  });
});

describe('formatPhone', () => {
  it('formats KZ E.164 number to display format', () => {
    expect(formatPhone('+77001234567')).toBe('+7 700 123 45 67');
  });

  it('returns non-KZ E.164 number unchanged', () => {
    expect(formatPhone('+12025551234')).toBe('+12025551234');
  });

  it('returns malformed input unchanged', () => {
    expect(formatPhone('not-a-phone')).toBe('not-a-phone');
  });

  it('returns empty string for null', () => {
    expect(formatPhone(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(formatPhone(undefined)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(formatPhone('')).toBe('');
  });

  it('returns +7 number shorter than 12 digits unchanged', () => {
    expect(formatPhone('+7700123456')).toBe('+7700123456');
  });
});

describe('maskIin', () => {
  it('keeps a valid 12-digit IIN unchanged', () => {
    expect(maskIin('123456789012')).toBe('123456789012');
  });

  it('strips non-digit characters', () => {
    expect(maskIin('1234 5678-9012')).toBe('123456789012');
    expect(maskIin('abc12cd34')).toBe('1234');
  });

  it('caps at 12 digits', () => {
    expect(maskIin('1234567890123456')).toBe('123456789012');
  });

  it('returns empty string for input without digits', () => {
    expect(maskIin('')).toBe('');
    expect(maskIin('---')).toBe('');
  });
});

describe('formatIinDisplay', () => {
  it('groups 12 digits as "6 + space + 6"', () => {
    expect(formatIinDisplay('123456789012')).toBe('123456 789012');
  });

  it('does not add a space until past 6 digits', () => {
    expect(formatIinDisplay('123456')).toBe('123456');
    expect(formatIinDisplay('1234567')).toBe('123456 7');
  });

  it('strips non-digits and caps at 12 before grouping', () => {
    expect(formatIinDisplay('1234 5678 9012 99')).toBe('123456 789012');
  });

  it('returns empty string for empty input', () => {
    expect(formatIinDisplay('')).toBe('');
  });
});
