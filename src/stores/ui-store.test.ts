import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_THEME,
  DEFAULT_RADIUS,
  THEMES,
  RADII,
  resolveThemeVars,
  deriveShadcnVars,
  isDarkTheme,
  DARK_THEMES,
} from '@/lib/themes';
import type { ThemeName, RadiusName } from '@/lib/themes';

// -- Minimal DOM shim for node test environment --

function makeLocalStorageShim() {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string): string | null => store[key] ?? null,
    setItem: (key: string, value: string): void => {
      store[key] = value;
    },
    removeItem: (key: string): void => {
      delete store[key];
    },
    clear: (): void => {
      for (const k of Object.keys(store)) delete store[k];
    },
    get length(): number {
      return Object.keys(store).length;
    },
    key: (index: number): string | null => Object.keys(store)[index] ?? null,
  };
}

const localStorageMock = makeLocalStorageShim();
vi.stubGlobal('localStorage', localStorageMock);

// zustand persist requires `window` to be defined (it accesses window.localStorage internally)
if (typeof globalThis.window === 'undefined') {
  vi.stubGlobal('window', { localStorage: localStorageMock });
} else {
  // If window already exists (some test runners), ensure localStorage is our mock
  Object.defineProperty(globalThis.window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });
}

const styleProps: Record<string, string> = {};
const classList = {
  _set: new Set<string>(),
  add(cls: string) {
    this._set.add(cls);
  },
  remove(cls: string) {
    this._set.delete(cls);
  },
  contains(cls: string) {
    return this._set.has(cls);
  },
};
const docAttrs: Record<string, string> = {};

const documentElementMock = {
  style: {
    setProperty: (prop: string, value: string) => {
      styleProps[prop] = value;
    },
    getPropertyValue: (prop: string) => styleProps[prop] ?? '',
  },
  classList,
  setAttribute: (attr: string, val: string) => {
    docAttrs[attr] = val;
  },
  removeAttribute: (attr: string) => {
    delete docAttrs[attr];
  },
};

vi.stubGlobal('document', {
  documentElement: documentElementMock,
});

// Import after stubs so module picks up the mocked globals
const { applyTheme, useUiStore } = await import('./ui-store');

const PERSIST_KEY = 'shyraq_admin_ui';

function clearAll() {
  localStorageMock.clear();
  for (const k of Object.keys(styleProps)) delete styleProps[k];
  classList._set.clear();
  for (const k of Object.keys(docAttrs)) delete docAttrs[k];
}

describe('lib/themes pure functions', () => {
  it('resolveThemeVars merges LIGHT_SEMANTIC for light themes', () => {
    const vars = resolveThemeVars('blue', 'soft');
    expect(vars['--primary']).toBe('#007BE0');
    expect(vars['--success']).toBe('#47D848');
    expect(vars['--danger']).toBe('#D9342B');
    expect(vars['--r-md']).toBe('8px');
  });

  it('resolveThemeVars does NOT merge LIGHT_SEMANTIC for dark theme', () => {
    const vars = resolveThemeVars('dark', 'soft');
    expect(vars['--primary']).toBe('#FFAF36');
    expect(vars['--danger']).toBe('#F87171');
    expect(vars['--success']).toBe('#47D848');
  });

  it('resolveThemeVars applies radius tokens', () => {
    const sharp = resolveThemeVars('green', 'sharp');
    expect(sharp['--r-xs']).toBe('2px');
    expect(sharp['--r-md']).toBe('4px');
    expect(sharp['--r-xl']).toBe('8px');

    const round = resolveThemeVars('green', 'round');
    expect(round['--r-xs']).toBe('6px');
    expect(round['--r-md']).toBe('14px');
    expect(round['--r-xl']).toBe('24px');
  });

  it('deriveShadcnVars maps design tokens to shadcn semantic vars', () => {
    const themeVars = resolveThemeVars('orange', 'soft');
    const shadcn = deriveShadcnVars(themeVars, isDarkTheme('orange'));
    expect(shadcn['--background']).toBe('#FFFFFF');
    expect(shadcn['--foreground']).toBe('#191410');
    expect(shadcn['--primary']).toBe('#FFAF36');
    expect(shadcn['--primary-foreground']).toBe('#FFFFFF');
    expect(shadcn['--destructive']).toBe('#D9342B');
    expect(shadcn['--border']).toBe('#E5E5E5');
    expect(shadcn['--sidebar']).toBe('#F8F8F8');
  });

  it('deriveShadcnVars for dark theme uses --on-primary from dark tokens', () => {
    const themeVars = resolveThemeVars('dark', 'soft');
    const shadcn = deriveShadcnVars(themeVars, isDarkTheme('dark'));
    expect(shadcn['--primary-foreground']).toBe('#191410');
    expect(shadcn['--background']).toBe('#0F0B07');
    expect(shadcn['--foreground']).toBe('#F5F2EC');
    expect(shadcn['--input']).toBe('#3D352A');
  });

  // Guards the old hex-sniffing bug: a non-dark theme whose --bg differs from
  // the dark sentinel must NOT be classified as dark.
  it('deriveShadcnVars does NOT apply dark --input for non-dark theme with unusual --bg', () => {
    // warmCream has --bg #F7F2E8, not #0F0B07 — must not be misclassified
    const themeVars = resolveThemeVars('warmCream', 'soft');
    const shadcn = deriveShadcnVars(themeVars, isDarkTheme('warmCream'));
    // Light path: --input === --border, NOT --border-strong
    expect(shadcn['--input']).toBe(themeVars['--border']);
    expect(shadcn['--input']).not.toBe(themeVars['--border-strong']);
  });

  // Proves detection is name-driven: isDarkTheme/DARK_THEMES is the authority.
  it('isDarkTheme correctly classifies dark and non-dark themes', () => {
    expect(isDarkTheme('dark')).toBe(true);
    expect(DARK_THEMES.has('dark')).toBe(true);
    // All current non-dark themes must return false
    const lightNames: ThemeName[] = [
      'green',
      'orange',
      'blue',
      'mono',
      'warmCream',
      'forestMint',
      'oceanBlue',
    ];
    for (const name of lightNames) {
      expect(isDarkTheme(name)).toBe(false);
    }
  });

  // Proves that deriveShadcnVars respects isDark=true regardless of token values.
  // Tests the helper directly with a synthetic token map that has a non-dark --bg
  // but is explicitly flagged isDark=true — confirming it's the parameter, not the hex.
  it('deriveShadcnVars applies dark --input when isDark=true regardless of --bg value', () => {
    const syntheticTokens: Record<string, string> = {
      '--bg': '#AABBCC', // not the dark hex — would fool old hex check
      '--border': '#111111',
      '--border-strong': '#222222',
    };
    const shadcn = deriveShadcnVars(syntheticTokens, true);
    expect(shadcn['--input']).toBe('#222222'); // dark path: --border-strong
  });
});

describe('applyTheme', () => {
  beforeEach(() => {
    clearAll();
  });

  it('writes expected CSS vars onto document.documentElement for green theme', () => {
    applyTheme('green', 'soft');
    expect(styleProps['--primary']).toBe('#47D848');
    expect(styleProps['--bg']).toBe('#FFFFFF');
    expect(styleProps['--r-md']).toBe('8px');
    expect(styleProps['--background']).toBe('#FFFFFF');
    expect(styleProps['--foreground']).toBe('#191410');
    expect(classList.contains('dark')).toBe(false);
    expect(docAttrs['data-theme']).toBeUndefined();
  });

  it('writes dark theme CSS vars and sets .dark class + data-theme', () => {
    applyTheme('dark', 'sharp');
    expect(styleProps['--primary']).toBe('#FFAF36');
    expect(styleProps['--bg']).toBe('#0F0B07');
    expect(styleProps['--text-1']).toBe('#F5F2EC');
    expect(styleProps['--r-md']).toBe('4px');
    expect(styleProps['--background']).toBe('#0F0B07');
    expect(classList.contains('dark')).toBe(true);
    expect(docAttrs['data-theme']).toBe('dark');
  });

  it('switching from dark to light removes .dark class', () => {
    applyTheme('dark', 'soft');
    expect(classList.contains('dark')).toBe(true);
    applyTheme('oceanBlue', 'soft');
    expect(classList.contains('dark')).toBe(false);
    expect(docAttrs['data-theme']).toBeUndefined();
    expect(styleProps['--primary']).toBe('#007BE0');
  });

  it('warmCream theme applies correct surface and text tokens', () => {
    applyTheme('warmCream', 'round');
    expect(styleProps['--bg']).toBe('#F7F2E8');
    expect(styleProps['--text-2']).toBe('#3A332A');
    expect(styleProps['--primary']).toBe('#FFAF36');
    expect(styleProps['--r-md']).toBe('14px');
  });

  it('forestMint theme applies expected values', () => {
    applyTheme('forestMint', 'soft');
    expect(styleProps['--primary']).toBe('#47D848');
    expect(styleProps['--bg']).toBe('#F0F5F2');
    expect(styleProps['--bg-sidebar']).toBe('#E9F0EC');
  });
});

describe('useUiStore', () => {
  beforeEach(() => {
    clearAll();
    // Reset zustand store to defaults between tests
    useUiStore.setState({
      locale: 'ru',
      sidebarCollapsed: false,
      theme: DEFAULT_THEME,
      radius: DEFAULT_RADIUS,
    });
  });

  it('has correct defaults', () => {
    const state = useUiStore.getState();
    expect(state.locale).toBe('ru');
    expect(state.theme).toBe('green');
    expect(state.radius).toBe('soft');
    expect(state.sidebarCollapsed).toBe(false);
  });

  it('setTheme updates state and applies CSS vars', () => {
    useUiStore.getState().setTheme('orange');
    expect(useUiStore.getState().theme).toBe('orange');
    expect(styleProps['--primary']).toBe('#FFAF36');
    expect(styleProps['--background']).toBe('#FFFFFF');
  });

  it('setRadius updates state and applies radius CSS vars', () => {
    useUiStore.getState().setRadius('sharp');
    expect(useUiStore.getState().radius).toBe('sharp');
    expect(styleProps['--r-md']).toBe('4px');
    expect(styleProps['--r-xl']).toBe('8px');
  });

  it('setLocale updates locale', () => {
    useUiStore.getState().setLocale('kk');
    expect(useUiStore.getState().locale).toBe('kk');
  });

  it('toggleSidebar toggles collapsed state', () => {
    expect(useUiStore.getState().sidebarCollapsed).toBe(false);
    useUiStore.getState().toggleSidebar();
    expect(useUiStore.getState().sidebarCollapsed).toBe(true);
    useUiStore.getState().toggleSidebar();
    expect(useUiStore.getState().sidebarCollapsed).toBe(false);
  });

  it('persists under key shyraq_admin_ui', () => {
    useUiStore.getState().setTheme('dark');
    const raw = localStorageMock.getItem(PERSIST_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.state.theme).toBe('dark');
    expect(parsed.state.radius).toBe('soft');
    expect(parsed.state.locale).toBe('ru');
  });

  it('persist round-trip: set theme -> serialize -> re-hydrate -> state reflects', () => {
    useUiStore.getState().setTheme('mono');
    useUiStore.getState().setRadius('round');
    useUiStore.getState().setLocale('kk');

    const serialized = localStorageMock.getItem(PERSIST_KEY);
    expect(serialized).not.toBeNull();

    clearAll();
    localStorageMock.setItem(PERSIST_KEY, serialized!);

    // Simulate rehydration by reading the persisted value
    const parsed = JSON.parse(serialized!);
    expect(parsed.state.theme).toBe('mono');
    expect(parsed.state.radius).toBe('round');
    expect(parsed.state.locale).toBe('kk');

    // Verify we can apply theme from persisted values
    applyTheme(parsed.state.theme as ThemeName, parsed.state.radius as RadiusName);
    expect(styleProps['--primary']).toBe('#191410');
    expect(styleProps['--r-md']).toBe('14px');
  });
});

describe('theme/radius completeness', () => {
  const themeNames: ThemeName[] = [
    'green',
    'orange',
    'blue',
    'mono',
    'warmCream',
    'forestMint',
    'oceanBlue',
    'dark',
  ];
  const radiusNames: RadiusName[] = ['sharp', 'soft', 'round'];

  it('encodes exactly 8 themes', () => {
    expect(Object.keys(THEMES)).toHaveLength(8);
    for (const name of themeNames) {
      expect(THEMES[name]).toBeDefined();
      expect(THEMES[name].label).toBeTruthy();
      expect(THEMES[name].swatches).toHaveLength(4);
      expect(Object.keys(THEMES[name].tokens).length).toBeGreaterThan(0);
    }
  });

  it('encodes exactly 3 radius presets', () => {
    expect(Object.keys(RADII)).toHaveLength(3);
    for (const name of radiusNames) {
      expect(RADII[name]).toBeDefined();
      expect(Object.keys(RADII[name].tokens)).toHaveLength(5);
    }
  });

  it('every theme+radius combo resolves without error', () => {
    for (const t of themeNames) {
      for (const r of radiusNames) {
        const vars = resolveThemeVars(t, r);
        expect(vars['--primary']).toBeTruthy();
        expect(vars['--r-md']).toBeTruthy();
      }
    }
  });
});
