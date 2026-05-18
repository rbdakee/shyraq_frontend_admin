/** HANDOFF §2.4: backend JSONB uses key `kz`; DTO/app locale enum uses `kk`. */
export type JsonbI18n = { ru?: string; kz?: string } | null | undefined;

type AppLocale = 'ru' | 'kk';

/**
 * Resolves a backend JSONB i18n object to a string for the given app locale.
 *
 * Key nuance (HANDOFF §2.4): backend stores Kazakh text under key `kz`,
 * while the app/DTO locale enum uses `kk`. This function maps `kk` → `kz`.
 *
 * Fallback chain: requested locale missing/empty → `ru` → `''`.
 */
export function resolveJsonbI18n(value: JsonbI18n, locale: AppLocale): string {
  if (value == null) return '';

  const dataKey = locale === 'kk' ? 'kz' : 'ru';
  const primary = value[dataKey];

  if (primary) return primary;

  // Fallback to `ru` if primary is missing or empty
  const fallback = value.ru;
  return fallback ?? '';
}
