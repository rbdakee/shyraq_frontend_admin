import type { SpecialistType } from '@/api/specialist-types';

// Resolves a specialist_type CODE to its display label from the per-kindergarten
// dictionary (N12). Labels live in backend `name_i18n` — the frontend no longer
// hardcodes them. Falls back to the raw code when the dictionary hasn't loaded or
// the code is unknown (mirrors the old diagnostics `defaultValue` behaviour).
export function specialistTypeLabel(
  code: string | null | undefined,
  types: SpecialistType[] | undefined,
  locale: string,
): string {
  if (!code) return '';
  const found = types?.find((t) => t.code === code);
  if (!found) return code;
  const loc = locale === 'kk' ? 'kk' : 'ru';
  return found.name_i18n[loc] || found.name_i18n.ru || found.name_i18n.kk || code;
}
