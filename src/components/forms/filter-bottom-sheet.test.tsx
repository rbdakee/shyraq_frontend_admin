// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

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

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'actions.apply': 'Применить',
        'actions.reset': 'Сбросить',
        'actions.close': 'Закрыть',
        'actions.back': 'Назад',
      };
      return translations[key] ?? key;
    },
    i18n: { language: 'ru', changeLanguage: vi.fn() },
  }),
}));

// Radix Sheet uses ResizeObserver via Radix internals — provide a stub for jsdom.
class StubResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
vi.stubGlobal('ResizeObserver', StubResizeObserver);

const { FilterBottomSheet } = await import('./filter-bottom-sheet');

describe('FilterBottomSheet', () => {
  beforeAll(() => {
    cleanup();
  });

  let originalMatchMedia: typeof window.matchMedia | undefined;
  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
  });
  afterEach(() => {
    if (originalMatchMedia) window.matchMedia = originalMatchMedia;
  });

  it('does not render its content when closed', () => {
    const { unmount } = render(
      <FilterBottomSheet open={false} onOpenChange={vi.fn()} title="Фильтры">
        <div data-testid="filters-body">body</div>
      </FilterBottomSheet>,
    );
    expect(screen.queryByTestId('filters-body')).toBeNull();
    unmount();
  });

  it('renders title + content when open', () => {
    const { unmount } = render(
      <FilterBottomSheet open={true} onOpenChange={vi.fn()} title="Фильтры">
        <div data-testid="filters-body">body</div>
      </FilterBottomSheet>,
    );
    expect(screen.getByText('Фильтры')).toBeDefined();
    expect(screen.getByTestId('filters-body')).toBeDefined();
    unmount();
  });

  it('renders Apply/Reset footer when handlers are provided and invokes them', () => {
    const onApply = vi.fn();
    const onReset = vi.fn();
    const onOpenChange = vi.fn();
    const { unmount } = render(
      <FilterBottomSheet
        open={true}
        onOpenChange={onOpenChange}
        title="Фильтры"
        onApply={onApply}
        onReset={onReset}
      >
        <div>body</div>
      </FilterBottomSheet>,
    );

    fireEvent.click(screen.getByTestId('filter-bottom-sheet-reset'));
    expect(onReset).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('filter-bottom-sheet-apply'));
    expect(onApply).toHaveBeenCalledTimes(1);
    // Radix SheetClose around Apply fires onOpenChange(false)
    expect(onOpenChange).toHaveBeenCalledWith(false);

    unmount();
  });

  it('hides the footer when no apply/reset handlers are provided', () => {
    const { unmount } = render(
      <FilterBottomSheet open={true} onOpenChange={vi.fn()} title="Фильтры">
        <div>body</div>
      </FilterBottomSheet>,
    );

    expect(screen.queryByTestId('filter-bottom-sheet-apply')).toBeNull();
    expect(screen.queryByTestId('filter-bottom-sheet-reset')).toBeNull();

    unmount();
  });
});
