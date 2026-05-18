import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { useUiStore } from '@/stores/ui-store';
import ruCommon from '@/locales/ru/common.json';
import ruErrors from '@/locales/ru/errors.json';
import kkCommon from '@/locales/kk/common.json';
import kkErrors from '@/locales/kk/errors.json';

const initialLocale = useUiStore.getState().locale;

void i18n.use(initReactI18next).init({
  resources: {
    ru: {
      common: ruCommon,
      errors: ruErrors,
    },
    kk: {
      common: kkCommon,
      errors: kkErrors,
    },
  },
  lng: initialLocale,
  fallbackLng: 'ru',
  defaultNS: 'common',
  interpolation: { escapeValue: false },
});

useUiStore.subscribe((s, prev) => {
  if (s.locale !== prev.locale) void i18n.changeLanguage(s.locale);
});

// WHY guarded: this module is imported in the api/client slice which runs unit
// tests under Vitest without jsdom — bare document access throws ReferenceError.
i18n.on('languageChanged', (lng) => {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lng;
  }
});

if (typeof document !== 'undefined') {
  document.documentElement.lang = i18n.resolvedLanguage ?? 'ru';
}

export default i18n;
