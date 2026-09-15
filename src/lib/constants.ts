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
// Child card mobile Billing section: rows shown per list (invoices/payments)
// before deferring to the full billing screens (DESIGN §6.3 B30).
export const MOBILE_BILLING_ROW_CAP = 5;
// Time mobile-shell badge queries stay fresh before TanStack Query refetches.
// Short enough to feel live, long enough to avoid hammering the API on every
// tab switch / window focus while the user is in the shell.
export const MOBILE_BADGE_STALE_MS = 60_000;

// WHY: media_url(s)/photo_url are presigned S3 links with a 1-hour signature
// TTL. Detail queries that render those links re-fetch on this interval (< 1h)
// so displayed signed URLs never expire on a screen left open & idle past the
// hour. See OPEN_QUESTIONS §A26 / IMPLEMENTATION_PLAN §B26.
export const MEDIA_PRESIGNED_REFETCH_MS = 50 * 60 * 1000;

// CCTV player — stream token refresh margin and minimum refetch interval.
// WHY 60 s margin: gateway tokens live ~1 h; refreshing 60 s early prevents
// segments returning 403 while the new /stream request is in flight.
export const STREAM_TOKEN_MARGIN_MS = 60_000;
// WHY 5 s floor: if expires_at is in the past or clock-skewed, a sub-second
// refetchInterval would create a busy-loop hammering the backend.
export const STREAM_MIN_REFETCH_MS = 5_000;

// HEVC capability probe string — passed to MediaSource.isTypeSupported().
export const HEVC_CODEC_PROBE = 'video/mp4; codecs="hvc1.1.6.L153.B0"';

// Codec freshness: if codec_checked_at is older than this, the camera row
// shows a warning indicator — the gateway may not be reaching the device.
export const CODEC_STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

// hls.js live-stream buffer limits (seconds). Small values are fine for
// real-time camera feeds — there is no archive/seekback.
export const HLS_MAX_BUFFER_LENGTH = 30;
export const HLS_MAX_MAX_BUFFER_LENGTH = 60;
