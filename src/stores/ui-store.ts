import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ThemeName, RadiusName } from '@/lib/themes';
import {
  DEFAULT_THEME,
  DEFAULT_RADIUS,
  isDarkTheme,
  resolveThemeVars,
  deriveShadcnVars,
} from '@/lib/themes';

type Locale = 'ru' | 'kk';

interface UiState {
  locale: Locale;
  setLocale: (l: Locale) => void;

  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;

  theme: ThemeName;
  radius: RadiusName;
  setTheme: (t: ThemeName) => void;
  setRadius: (r: RadiusName) => void;
}

/**
 * Apply the computed CSS-var map for theme+radius onto document.documentElement.
 * Merges Shyraq design tokens with derived shadcn semantic vars so both
 * the handoff components and shadcn primitives render correctly.
 * Guards for non-DOM environments (tests without jsdom).
 */
export function applyTheme(theme: ThemeName, radius: RadiusName): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const themeVars = resolveThemeVars(theme, radius);
  const shadcnVars = deriveShadcnVars(themeVars, isDarkTheme(theme));
  const merged = { ...themeVars, ...shadcnVars };

  for (const [prop, value] of Object.entries(merged)) {
    root.style.setProperty(prop, value);
  }

  // Mark dark mode for conditional styles
  if (theme === 'dark') {
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
  } else {
    root.classList.remove('dark');
    root.removeAttribute('data-theme');
  }
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      locale: 'ru',
      setLocale: (locale) => set({ locale }),

      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),

      theme: DEFAULT_THEME,
      radius: DEFAULT_RADIUS,
      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme, get().radius);
      },
      setRadius: (radius) => {
        set({ radius });
        applyTheme(get().theme, radius);
      },
    }),
    {
      name: 'shyraq_admin_ui',
      partialize: (state) => ({
        locale: state.locale,
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme,
        radius: state.radius,
      }),
      onRehydrateStorage: () => (state) => {
        // Apply persisted theme on rehydration (boot / reload)
        if (state) {
          applyTheme(state.theme, state.radius);
        }
      },
    },
  ),
);
