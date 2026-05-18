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

/**
 * Formats an E.164 phone number to Admin display format: `+7 700 123 45 67`.
 * Invalid or non-E.164 input is returned unchanged (same contract as superadmin).
 * Only KZ numbers (+7, length 12) are reformatted; others pass through.
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  if (!E164_RE.test(phone)) return phone;
  if (phone.startsWith('+7') && phone.length === 12) {
    return `+7 ${phone.slice(2, 5)} ${phone.slice(5, 8)} ${phone.slice(8, 10)} ${phone.slice(10, 12)}`;
  }
  return phone;
}
