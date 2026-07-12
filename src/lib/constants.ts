// WHY hardcoded default: kindergarten timezone should come from /admin/kindergarten
// settings (B15); until that endpoint is wired, we use Kazakhstan's principal tz.
export const DEFAULT_TIMEZONE = 'Asia/Almaty';

export const OTP_RESEND_SECONDS = 60;
export const OTP_LOCK_SECONDS = 15 * 60;
export const ENTITY_COMBOBOX_DEBOUNCE_MS = 300;
export const SEARCH_DEBOUNCE_MS = 300;

// specialist_type is no longer a hardcoded enum — it's an admin-managed per-kindergarten
// dictionary (N12). See api/specialist-types.ts / lib/specialist-type.ts.

// Mobile tab-bar badge: display max before falling back to "99+".
export const MOBILE_BADGE_MAX = 99;
// Time mobile-shell badge queries stay fresh before TanStack Query refetches.
// Short enough to feel live, long enough to avoid hammering the API on every
// tab switch / window focus while the user is in the shell.
export const MOBILE_BADGE_STALE_MS = 60_000;

// WHY: media_url(s)/photo_url are presigned S3 links with a 1-hour signature
// TTL. Detail queries that render those links re-fetch on this interval (< 1h)
// so displayed signed URLs never expire on a screen left open & idle past the
// hour. See OPEN_QUESTIONS §A26 / IMPLEMENTATION_PLAN §B26.
export const MEDIA_PRESIGNED_REFETCH_MS = 50 * 60 * 1000;
