import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Shim localStorage before any module import — Zustand persist reads it at
// module-init time. Pattern mirrors token-storage.test.ts in this repo.
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

vi.stubGlobal('localStorage', makeLocalStorageShim());

// Import AFTER shim is in place.
const { default: i18n } = await import('./i18n');
const { useUiStore } = await import('@/stores/ui-store');

describe('i18n — Node-safe import (no jsdom)', () => {
  it('importing the module does not throw in a no-DOM environment', () => {
    // If we reached this line, the import succeeded — DOM guards worked.
    expect(i18n).toBeDefined();
  });
});

describe('i18n — defaultNS common', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('ru');
  });

  it('i18n.t("loading") resolves from common namespace', () => {
    const result = i18n.t('loading');
    expect(result).toBeTruthy();
    expect(result).not.toBe('loading');
  });

  it('i18n.t("actions.save") resolves', () => {
    const result = i18n.t('actions.save');
    expect(result).toBeTruthy();
    expect(result).not.toBe('actions.save');
  });
});

describe('i18n — errors namespace (RU)', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('ru');
  });

  it('errors:child_not_found resolves to a non-empty string ≠ key', () => {
    const result = i18n.t('errors:child_not_found');
    expect(result).toBeTruthy();
    expect(result).not.toBe('errors:child_not_found');
    expect(result).not.toBe('child_not_found');
  });

  it('errors:unknown_error resolves', () => {
    const result = i18n.t('errors:unknown_error');
    expect(result).toBeTruthy();
    expect(result).not.toBe('errors:unknown_error');
  });

  it('errors:validation_error resolves', () => {
    const result = i18n.t('errors:validation_error');
    expect(result).toBeTruthy();
    expect(result).not.toBe('errors:validation_error');
  });
});

describe('i18n — locale switch via store', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('ru');
  });

  it('after setLocale("kk") a known key resolves to KK value', async () => {
    useUiStore.getState().setLocale('kk');
    // Give the subscription a tick to call changeLanguage
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    const result = i18n.t('errors:unknown_error');
    expect(result).toBeTruthy();
    expect(result).not.toBe('errors:unknown_error');
    // RU value is "Неизвестная ошибка"; KK must differ
    expect(result).not.toBe('Неизвестная ошибка');
  });

  it('fallbackLng works: key only in RU resolves when lang=kk', async () => {
    await i18n.changeLanguage('kk');
    // loading exists in both, but the fallback mechanism is exercised when a
    // key is only in ru — we test it directly via addResourceBundle manipulation.
    // Simpler approach: an empty KK key falls back to RU.
    i18n.addResourceBundle('kk', 'common', { only_in_ru_test: undefined }, true, true);
    i18n.addResourceBundle('ru', 'common', { only_in_ru_test: 'fallback-value' }, true, true);

    const result = i18n.t('only_in_ru_test');
    expect(result).toBe('fallback-value');
  });
});

describe('i18n — direct changeLanguage to kk', () => {
  it('switches language and resolves KK translation', async () => {
    await i18n.changeLanguage('kk');
    const result = i18n.t('loading');
    expect(result).toBeTruthy();
    expect(result).not.toBe('loading');
    // KK value is "Жүктелуде..."; RU is "Загрузка..."
    expect(result).not.toBe('Загрузка...');
  });
});
