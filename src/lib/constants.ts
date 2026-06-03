// WHY hardcoded default: kindergarten timezone should come from /admin/kindergarten
// settings (B15); until that endpoint is wired, we use Kazakhstan's principal tz.
export const DEFAULT_TIMEZONE = 'Asia/Almaty';

export const OTP_RESEND_SECONDS = 60;
export const OTP_LOCK_SECONDS = 15 * 60;
export const ENTITY_COMBOBOX_DEBOUNCE_MS = 300;
export const SEARCH_DEBOUNCE_MS = 300;

export type SpecialistType =
  | 'psychologist'
  | 'speech_therapist'
  | 'music_teacher'
  | 'physical_ed'
  | 'nutritionist';

export const SPECIALIST_TYPES: SpecialistType[] = [
  'psychologist',
  'speech_therapist',
  'music_teacher',
  'physical_ed',
  'nutritionist',
];

// Mobile tab-bar badge: display max before falling back to "99+".
export const MOBILE_BADGE_MAX = 99;
// Time mobile-shell badge queries stay fresh before TanStack Query refetches.
// Short enough to feel live, long enough to avoid hammering the API on every
// tab switch / window focus while the user is in the shell.
export const MOBILE_BADGE_STALE_MS = 60_000;
