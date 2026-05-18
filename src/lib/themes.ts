/**
 * Theme definitions derived from docs/design/handoff/shyraq-admin/project/app.jsx#THEMES.
 * Pure data + types — no React, no store imports.
 */

export type ThemeName =
  | 'green'
  | 'orange'
  | 'blue'
  | 'mono'
  | 'warmCream'
  | 'forestMint'
  | 'oceanBlue'
  | 'dark';

export type RadiusName = 'sharp' | 'soft' | 'round';

export interface ThemeDefinition {
  readonly label: string;
  readonly sub: string;
  readonly swatches: readonly [string, string, string, string];
  readonly tokens: Readonly<Record<string, string>>;
}

export interface RadiusDefinition {
  readonly tokens: Readonly<Record<string, string>>;
}

// Light themes share this semantic palette (brand-aligned from app.jsx LIGHT_SEMANTIC)
const LIGHT_SEMANTIC: Readonly<Record<string, string>> = {
  '--success': '#47D848',
  '--success-soft': '#DFF3DF',
  '--success-fg': '#1F6B20',
  '--warning': '#FFAF36',
  '--warning-soft': '#FFF0D6',
  '--warning-fg': '#7A4A0A',
  '--danger': '#D9342B',
  '--danger-soft': '#FCE0DD',
  '--danger-fg': '#911C16',
  '--info': '#007BE0',
  '--info-soft': '#DDEAF9',
  '--info-fg': '#003D7A',
  '--neutral-soft': '#EDEDED',
  '--neutral-fg': '#303030',
  '--on-primary': '#FFFFFF',
};

export const THEMES: Readonly<Record<ThemeName, ThemeDefinition>> = {
  green: {
    label: 'Жасыл — бренд',
    sub: 'Зелёный акцент, светлая база',
    swatches: ['#47D848', '#FFFFFF', '#303030', '#191410'],
    tokens: {
      '--primary': '#47D848',
      '--primary-bright': '#62E263',
      '--primary-hover': '#39B83A',
      '--primary-active': '#2A8B2C',
      '--primary-soft': '#E0F7E0',
      '--primary-soft-hover': '#C9F0CA',
      '--primary-fg': '#1F6B20',
      '--bg': '#FFFFFF',
      '--bg-elev': '#FFFFFF',
      '--bg-sunken': '#F2F2F2',
      '--bg-subtle': '#F8F8F8',
      '--bg-sidebar': '#F8F8F8',
      '--border': '#E5E5E5',
      '--border-strong': '#D0D0D0',
      '--line': '#EDEDED',
      '--text-1': '#191410',
      '--text-2': '#303030',
      '--text-3': '#6B6B6B',
      '--text-4': '#A0A0A0',
    },
  },

  orange: {
    label: 'Қызғылт сары — бренд',
    sub: 'Оранжевый акцент, светлая база',
    swatches: ['#FFAF36', '#FFFFFF', '#303030', '#191410'],
    tokens: {
      '--primary': '#FFAF36',
      '--primary-bright': '#FFC76A',
      '--primary-hover': '#E5961F',
      '--primary-active': '#B47215',
      '--primary-soft': '#FFF3DC',
      '--primary-soft-hover': '#FFE6BC',
      '--primary-fg': '#8B5A0E',
      '--bg': '#FFFFFF',
      '--bg-elev': '#FFFFFF',
      '--bg-sunken': '#F2F2F2',
      '--bg-subtle': '#F8F8F8',
      '--bg-sidebar': '#F8F8F8',
      '--border': '#E5E5E5',
      '--border-strong': '#D0D0D0',
      '--line': '#EDEDED',
      '--text-1': '#191410',
      '--text-2': '#303030',
      '--text-3': '#6B6B6B',
      '--text-4': '#A0A0A0',
    },
  },

  blue: {
    label: 'Көк — бренд',
    sub: 'Синий акцент, светлая база',
    swatches: ['#007BE0', '#FFFFFF', '#303030', '#191410'],
    tokens: {
      '--primary': '#007BE0',
      '--primary-bright': '#3FA0EE',
      '--primary-hover': '#0061B0',
      '--primary-active': '#00477D',
      '--primary-soft': '#DDEDFC',
      '--primary-soft-hover': '#BFDDF9',
      '--primary-fg': '#003D7A',
      '--bg': '#FFFFFF',
      '--bg-elev': '#FFFFFF',
      '--bg-sunken': '#F2F2F2',
      '--bg-subtle': '#F8F8F8',
      '--bg-sidebar': '#F8F8F8',
      '--border': '#E5E5E5',
      '--border-strong': '#D0D0D0',
      '--line': '#EDEDED',
      '--text-1': '#191410',
      '--text-2': '#303030',
      '--text-3': '#6B6B6B',
      '--text-4': '#A0A0A0',
    },
  },

  mono: {
    label: 'Қара — бренд',
    sub: 'Чёрно-белая монохромная',
    swatches: ['#191410', '#FFFFFF', '#303030', '#A0A0A0'],
    tokens: {
      '--primary': '#191410',
      '--primary-bright': '#303030',
      '--primary-hover': '#0F0C08',
      '--primary-active': '#000000',
      '--primary-soft': '#EDEDED',
      '--primary-soft-hover': '#DCDCDC',
      '--primary-fg': '#191410',
      '--bg': '#FFFFFF',
      '--bg-elev': '#FFFFFF',
      '--bg-sunken': '#F2F2F2',
      '--bg-subtle': '#F8F8F8',
      '--bg-sidebar': '#F8F8F8',
      '--border': '#E5E5E5',
      '--border-strong': '#D0D0D0',
      '--line': '#EDEDED',
      '--text-1': '#191410',
      '--text-2': '#303030',
      '--text-3': '#6B6B6B',
      '--text-4': '#A0A0A0',
    },
  },

  warmCream: {
    label: 'Тёплая молочная',
    sub: 'Оранжевый + кремовая база',
    swatches: ['#FFAF36', '#F7F2E8', '#191410', '#7A776E'],
    tokens: {
      '--primary': '#FFAF36',
      '--primary-bright': '#FFC76A',
      '--primary-hover': '#E5961F',
      '--primary-active': '#B47215',
      '--primary-soft': '#FFF0D6',
      '--primary-soft-hover': '#FFE2B5',
      '--primary-fg': '#7A4A0A',
      '--bg': '#F7F2E8',
      '--bg-elev': '#FFFCF5',
      '--bg-sunken': '#EFE9DA',
      '--bg-subtle': '#FAF6EC',
      '--bg-sidebar': '#F3EDDE',
      '--border': '#E0D8C5',
      '--border-strong': '#CFC5AC',
      '--line': '#E7E0CC',
      '--text-1': '#191410',
      '--text-2': '#3A332A',
      '--text-3': '#7A6F5C',
      '--text-4': '#A89E89',
    },
  },

  forestMint: {
    label: 'Мятный лес',
    sub: 'Зелёный + холодная база',
    swatches: ['#47D848', '#F0F5F2', '#303030', '#9AA59E'],
    tokens: {
      '--primary': '#47D848',
      '--primary-bright': '#62E263',
      '--primary-hover': '#39B83A',
      '--primary-active': '#2A8B2C',
      '--primary-soft': '#DDF3DD',
      '--primary-soft-hover': '#C7EBC7',
      '--primary-fg': '#1F6B20',
      '--bg': '#F0F5F2',
      '--bg-elev': '#FFFFFF',
      '--bg-sunken': '#E5EDE8',
      '--bg-subtle': '#F5F8F6',
      '--bg-sidebar': '#E9F0EC',
      '--border': '#D6E0DA',
      '--border-strong': '#BFCCC4',
      '--line': '#DEE6E1',
      '--text-1': '#191410',
      '--text-2': '#303030',
      '--text-3': '#6B7570',
      '--text-4': '#9AA59E',
    },
  },

  oceanBlue: {
    label: 'Океан',
    sub: 'Синий + прохладная база',
    swatches: ['#007BE0', '#F3F6F9', '#0F172A', '#64748B'],
    tokens: {
      '--primary': '#007BE0',
      '--primary-bright': '#3FA0EE',
      '--primary-hover': '#0061B0',
      '--primary-active': '#00477D',
      '--primary-soft': '#DDEAF9',
      '--primary-soft-hover': '#BED9F4',
      '--primary-fg': '#003D7A',
      '--bg': '#F3F6F9',
      '--bg-elev': '#FFFFFF',
      '--bg-sunken': '#E8EDF3',
      '--bg-subtle': '#F7FAFC',
      '--bg-sidebar': '#EBF0F5',
      '--border': '#D5DDE6',
      '--border-strong': '#BCC7D2',
      '--line': '#DCE3EB',
      '--text-1': '#0F172A',
      '--text-2': '#334155',
      '--text-3': '#64748B',
      '--text-4': '#94A3B8',
    },
  },

  dark: {
    label: 'Қараңғы — тёмная',
    sub: 'Тёмный фон, оранжевый акцент',
    swatches: ['#FFAF36', '#191410', '#303030', '#F5F2EC'],
    tokens: {
      '--primary': '#FFAF36',
      '--primary-bright': '#FFC76A',
      '--primary-hover': '#FFBE56',
      '--primary-active': '#E5961F',
      '--primary-soft': 'rgba(255, 175, 54, 0.16)',
      '--primary-soft-hover': 'rgba(255, 175, 54, 0.24)',
      '--primary-fg': '#FFC76A',
      '--on-primary': '#191410',
      '--bg': '#0F0B07',
      '--bg-elev': '#1A1611',
      '--bg-sunken': '#0A0805',
      '--bg-subtle': '#15110D',
      '--bg-sidebar': '#0C0905',
      '--border': '#2A241C',
      '--border-strong': '#3D352A',
      '--line': '#241E16',
      '--text-1': '#F5F2EC',
      '--text-2': '#C5C0B6',
      '--text-3': '#8A867D',
      '--text-4': '#5F5C56',
      '--success': '#47D848',
      '--success-soft': 'rgba(71, 216, 72, 0.18)',
      '--success-fg': '#7AE57B',
      '--warning': '#FFAF36',
      '--warning-soft': 'rgba(255, 175, 54, 0.18)',
      '--warning-fg': '#FFC76A',
      '--danger': '#F87171',
      '--danger-soft': 'rgba(248, 113, 113, 0.18)',
      '--danger-fg': '#FCA5A5',
      '--info': '#60A5FA',
      '--info-soft': 'rgba(96, 165, 250, 0.18)',
      '--info-fg': '#93C5FD',
      '--neutral-soft': 'rgba(255, 255, 255, 0.06)',
      '--neutral-fg': '#C5C0B6',
    },
  },
};

export const RADII: Readonly<Record<RadiusName, RadiusDefinition>> = {
  sharp: {
    tokens: {
      '--r-xs': '2px',
      '--r-sm': '3px',
      '--r-md': '4px',
      '--r-lg': '6px',
      '--r-xl': '8px',
    },
  },
  soft: {
    tokens: {
      '--r-xs': '4px',
      '--r-sm': '6px',
      '--r-md': '8px',
      '--r-lg': '12px',
      '--r-xl': '16px',
    },
  },
  round: {
    tokens: {
      '--r-xs': '6px',
      '--r-sm': '10px',
      '--r-md': '14px',
      '--r-lg': '18px',
      '--r-xl': '24px',
    },
  },
};

export const DEFAULT_THEME: ThemeName = 'green';
export const DEFAULT_RADIUS: RadiusName = 'soft';

/**
 * Source-of-truth set of dark theme names (derived from app.jsx#THEMES).
 * Dark themes carry their own semantic overrides and need different shadcn bridging.
 */
export const DARK_THEMES = new Set<ThemeName>(['dark']);

/** Returns true when the given theme name is a dark-mode theme. */
export function isDarkTheme(name: ThemeName): boolean {
  return DARK_THEMES.has(name);
}

/**
 * Compute the full CSS-var override map for a given theme + radius.
 * Light themes get LIGHT_SEMANTIC merged; dark theme has its own semantic tokens.
 */
export function resolveThemeVars(theme: ThemeName, radius: RadiusName): Record<string, string> {
  const themeDef = THEMES[theme];
  const radiusDef = RADII[radius];
  const dark = isDarkTheme(theme);

  return {
    ...(dark ? {} : LIGHT_SEMANTIC),
    ...themeDef.tokens,
    ...radiusDef.tokens,
  };
}

/**
 * Bridge Shyraq design tokens to shadcn semantic vars.
 * isDark must be passed by the caller (derived from ThemeName via isDarkTheme),
 * not sniffed from a token hex value — theme identity is the authoritative signal.
 */
export function deriveShadcnVars(
  themeTokens: Record<string, string>,
  isDark: boolean,
): Record<string, string> {
  return {
    '--background': themeTokens['--bg'] ?? '#F7F6F2',
    '--foreground': themeTokens['--text-1'] ?? '#1A1916',
    '--card': themeTokens['--bg-elev'] ?? '#FFFFFF',
    '--card-foreground': themeTokens['--text-1'] ?? '#1A1916',
    '--popover': themeTokens['--bg-elev'] ?? '#FFFFFF',
    '--popover-foreground': themeTokens['--text-1'] ?? '#1A1916',
    '--primary': themeTokens['--primary'] ?? '#0E7C66',
    '--primary-foreground': themeTokens['--on-primary'] ?? '#FFFFFF',
    '--secondary': themeTokens['--bg-sunken'] ?? '#EFEEEA',
    '--secondary-foreground': themeTokens['--text-1'] ?? '#1A1916',
    '--muted': themeTokens['--bg-sunken'] ?? '#EFEEEA',
    '--muted-foreground': themeTokens['--text-3'] ?? '#7A776E',
    '--accent': themeTokens['--primary-soft'] ?? '#DCEFE9',
    '--accent-foreground': themeTokens['--primary-fg'] ?? '#064B3D',
    '--destructive': themeTokens['--danger'] ?? '#B42318',
    '--border': themeTokens['--border'] ?? '#E5E2DB',
    '--input': isDark
      ? (themeTokens['--border-strong'] ?? '#3D352A')
      : (themeTokens['--border'] ?? '#E5E2DB'),
    '--ring': themeTokens['--primary'] ?? '#0E7C66',
    '--sidebar': themeTokens['--bg-sidebar'] ?? '#FBFAF6',
    '--sidebar-foreground': themeTokens['--text-1'] ?? '#1A1916',
    '--sidebar-primary': themeTokens['--primary'] ?? '#0E7C66',
    '--sidebar-primary-foreground': themeTokens['--on-primary'] ?? '#FFFFFF',
    '--sidebar-accent': themeTokens['--primary-soft'] ?? '#DCEFE9',
    '--sidebar-accent-foreground': themeTokens['--primary-fg'] ?? '#064B3D',
    '--sidebar-border': themeTokens['--line'] ?? '#EBE8E1',
    '--sidebar-ring': themeTokens['--primary'] ?? '#0E7C66',
  };
}
