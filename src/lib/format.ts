// E.164 regex is an immutable telecom spec — allowed hardcoded constant per CLAUDE.md §5
const E164_RE = /^\+[1-9]\d{1,14}$/;

// Intl formatter reuse: ru-RU uses non-breaking space (U+00A0) as thousands separator.
// We normalize to regular space (U+0020) to match design spec `120 000 ₸` exactly.
const kztFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });

/**
 * Formats an integer KZT amount to Admin design spec: `120 000 ₸`.
 * Fractional tiyn are not used in Admin billing (all amounts are integer kopek-equivalent);
 * the formatter truncates any fractional part — callers must pass pre-rounded values.
 */
export function formatMoney(amount: number): string {
  const grouped = kztFormatter.format(amount).replace(/\u00a0/g, ' ');
  return grouped + ' ₸';
}

/**
 * Formats an ISO string or Date to `дд.мм.гггг чч:мм` (24h, zero-padded) in the
 * supplied IANA timeZone. The kindergarten timezone is provided by the caller —
 * it is not hardcoded here so the formatter works for any branch/timezone.
 */
export function formatDateTime(value: string | Date, timeZone: string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  const parts = new Intl.DateTimeFormat('ru-RU', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return `${get('day')}.${get('month')}.${get('year')} ${get('hour')}:${get('minute')}`;
}

/**
 * Formats an ISO string or Date to `дд.мм.гггг` in the supplied IANA timeZone.
 */
export function formatDate(value: string | Date, timeZone: string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  const parts = new Intl.DateTimeFormat('ru-RU', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return `${get('day')}.${get('month')}.${get('year')}`;
}

// KZ IIN (ИИН) is an immutable spec: exactly 12 decimal digits.
const IIN_MAX_DIGITS = 12;
// Non-breaking space prevents line-wrap between IIN digit groups in narrow table cells
const NBSP = ' ';

/**
 * Canonical IIN value: digits only, capped at 12. The form/Zod/submit always
 * work on this (no spaces), so backend contract is unaffected by the display mask.
 */
export function maskIin(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, IIN_MAX_DIGITS);
}

/**
 * Display mask for the IIN field (6 + NBSP + 6), matching the
 * placeholder. Input only — the stored value stays digit-only.
 */
export function formatIinDisplay(raw: string): string {
  const d = maskIin(raw);
  return d.length > 6 ? d.slice(0, 6) + NBSP + d.slice(6) : d;
}

const IIN_VISIBLE_PREFIX = 6;
const IIN_MASK_CHAR = '•'; // U+2022 BULLET

/**
 * Partial-mask for list views: first 6 digits visible, last 6 replaced with bullets.
 * Groups joined by NBSP (U+00A0). Null/undefined/empty returns empty string.
 */
export function formatIinMasked(raw: string | null | undefined): string {
  if (!raw) return '';
  const d = maskIin(raw);
  if (d.length === 0) return '';
  const visible = d.slice(0, IIN_VISIBLE_PREFIX);
  const hiddenCount = d.length > IIN_VISIBLE_PREFIX ? d.length - IIN_VISIBLE_PREFIX : 0;
  if (hiddenCount === 0) return visible;
  return visible + NBSP + IIN_MASK_CHAR.repeat(hiddenCount);
}

/**
 * Formats an E.164 phone number to Admin display format: `+7 700 123 45 67`.
 * Invalid or non-E.164 input is returned unchanged (same contract as superadmin).
 * Only KZ numbers (+7, length 12) are reformatted; others pass through.
 */
export function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return (parts[0]?.[0] ?? '?').toUpperCase();
}

export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  if (!E164_RE.test(phone)) return phone;
  if (phone.startsWith('+7') && phone.length === 12) {
    return `+7 ${phone.slice(2, 5)} ${phone.slice(5, 8)} ${phone.slice(8, 10)} ${phone.slice(10, 12)}`;
  }
  return phone;
}
