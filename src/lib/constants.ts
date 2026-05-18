// WHY hardcoded default: kindergarten timezone should come from /admin/kindergarten
// settings (B15); until that endpoint is wired, we use Kazakhstan's principal tz.
export const DEFAULT_TIMEZONE = 'Asia/Almaty';

export const OTP_RESEND_SECONDS = 60;
export const OTP_LOCK_SECONDS = 15 * 60;
export const ENTITY_COMBOBOX_DEBOUNCE_MS = 300;
export const SEARCH_DEBOUNCE_MS = 300;
