// §A19: both `kk` (BCP 47, new MultiLangTextDto) and `kz` (legacy JSONB) mean Kazakh — resolve either.
export type JsonbI18n = { ru?: string; kz?: string; kk?: string } | null | undefined;

type AppLocale = 'ru' | 'kk';

export function resolveJsonbI18n(value: JsonbI18n, locale: AppLocale): string {
  if (value == null) return '';

  if (locale === 'kk') {
    const kk = value.kk;
    if (kk) return kk;
    const kz = value.kz;
    if (kz) return kz;
    return value.ru ?? '';
  }

  return value.ru ?? '';
}
