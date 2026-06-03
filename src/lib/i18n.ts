import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { useUiStore } from '@/stores/ui-store';
import ruCommon from '@/locales/ru/common.json';
import ruErrors from '@/locales/ru/errors.json';
import ruAuth from '@/locales/ru/auth.json';
import ruDatatable from '@/locales/ru/datatable.json';
import ruFeedback from '@/locales/ru/feedback.json';
import ruForms from '@/locales/ru/forms.json';
import ruDashboard from '@/locales/ru/dashboard.json';
import ruChildren from '@/locales/ru/children.json';
import ruEnrollments from '@/locales/ru/enrollments.json';
import ruGroups from '@/locales/ru/groups.json';
import ruStaff from '@/locales/ru/staff.json';
import ruBilling from '@/locales/ru/billing.json';
import ruParentRequests from '@/locales/ru/parent-requests.json';
import ruAttendance from '@/locales/ru/attendance.json';
import ruSchedule from '@/locales/ru/schedule.json';
import ruMealPlans from '@/locales/ru/meal-plans.json';
import ruContent from '@/locales/ru/content.json';
import ruDiagnostics from '@/locales/ru/diagnostics.json';
import kkCommon from '@/locales/kk/common.json';
import kkErrors from '@/locales/kk/errors.json';
import kkAuth from '@/locales/kk/auth.json';
import kkDatatable from '@/locales/kk/datatable.json';
import kkFeedback from '@/locales/kk/feedback.json';
import kkForms from '@/locales/kk/forms.json';
import kkDashboard from '@/locales/kk/dashboard.json';
import kkChildren from '@/locales/kk/children.json';
import kkEnrollments from '@/locales/kk/enrollments.json';
import kkGroups from '@/locales/kk/groups.json';
import kkStaff from '@/locales/kk/staff.json';
import kkBilling from '@/locales/kk/billing.json';
import kkParentRequests from '@/locales/kk/parent-requests.json';
import kkAttendance from '@/locales/kk/attendance.json';
import kkSchedule from '@/locales/kk/schedule.json';
import kkMealPlans from '@/locales/kk/meal-plans.json';
import kkContent from '@/locales/kk/content.json';
import kkDiagnostics from '@/locales/kk/diagnostics.json';

const initialLocale = useUiStore.getState().locale;

void i18n.use(initReactI18next).init({
  resources: {
    ru: {
      common: ruCommon,
      errors: ruErrors,
      auth: ruAuth,
      datatable: ruDatatable,
      feedback: ruFeedback,
      forms: ruForms,
      dashboard: ruDashboard,
      children: ruChildren,
      enrollments: ruEnrollments,
      groups: ruGroups,
      staff: ruStaff,
      billing: ruBilling,
      'parent-requests': ruParentRequests,
      attendance: ruAttendance,
      schedule: ruSchedule,
      'meal-plans': ruMealPlans,
      content: ruContent,
      diagnostics: ruDiagnostics,
    },
    kk: {
      common: kkCommon,
      errors: kkErrors,
      auth: kkAuth,
      datatable: kkDatatable,
      feedback: kkFeedback,
      forms: kkForms,
      dashboard: kkDashboard,
      children: kkChildren,
      enrollments: kkEnrollments,
      groups: kkGroups,
      staff: kkStaff,
      billing: kkBilling,
      'parent-requests': kkParentRequests,
      attendance: kkAttendance,
      schedule: kkSchedule,
      'meal-plans': kkMealPlans,
      content: kkContent,
      diagnostics: kkDiagnostics,
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
