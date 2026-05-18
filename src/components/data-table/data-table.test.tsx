// @vitest-environment jsdom
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import type { ColumnDef } from '@tanstack/react-table';

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
  useTranslation: (ns?: string) => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'datatable:showing': `${params?.from ?? ''}–${params?.to ?? ''} из ${params?.total ?? ''}`,
        'datatable:no_results': 'Ничего не найдено',
        'datatable:no_results_filter': 'Ничего не найдено по заданным фильтрам',
        'datatable:loading': 'Загрузка данных...',
        'datatable:error': 'Не удалось загрузить данные',
        'datatable:load_more': 'Загрузить ещё',
        'datatable:reset_filters': 'Сбросить фильтры',
        'common:actions.retry': 'Повторить',
      };
      const fullKey = key.includes(':') ? key : `${ns ?? 'datatable'}:${key}`;
      return translations[fullKey] ?? key;
    },
    i18n: { language: 'ru', changeLanguage: vi.fn() },
  }),
}));

const { DataTable } = await import('./data-table');

interface TestRow {
  id: string;
  name: string;
}

const columns: ColumnDef<TestRow, unknown>[] = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'name', header: 'Name' },
];

const sampleData: TestRow[] = [
  { id: '1', name: 'Alice' },
  { id: '2', name: 'Bob' },
  { id: '3', name: 'Charlie' },
];

describe('DataTable — offset pagination', () => {
  beforeAll(() => {
    cleanup();
  });

  it('renders "from-to из total" text and page buttons', () => {
    const onPageChange = vi.fn();
    const { unmount } = render(
      <DataTable
        columns={columns}
        data={sampleData}
        pagination={{
          mode: 'offset',
          page: 1,
          pageSize: 20,
          total: 45,
          onPageChange,
        }}
      />,
    );

    const paginationEl = screen.getByTestId('offset-pagination');
    expect(paginationEl).toBeDefined();
    expect(paginationEl.textContent).toContain('1–3 из 45');

    const page2Button = screen.getByRole('button', { name: '2' });
    expect(page2Button).toBeDefined();
    fireEvent.click(page2Button);
    expect(onPageChange).toHaveBeenCalledWith(2);

    unmount();
  });

  it('disables previous button on first page', () => {
    const { unmount } = render(
      <DataTable
        columns={columns}
        data={sampleData}
        pagination={{
          mode: 'offset',
          page: 1,
          pageSize: 20,
          total: 45,
          onPageChange: vi.fn(),
        }}
      />,
    );

    const prevButton = screen.getByRole('button', { name: 'Previous page' });
    expect(prevButton).toBeDefined();
    expect((prevButton as HTMLButtonElement).disabled).toBe(true);

    unmount();
  });

  it('calls onPageChange for next button', () => {
    const onPageChange = vi.fn();
    const { unmount } = render(
      <DataTable
        columns={columns}
        data={sampleData}
        pagination={{
          mode: 'offset',
          page: 1,
          pageSize: 20,
          total: 45,
          onPageChange,
        }}
      />,
    );

    const nextButton = screen.getByRole('button', { name: 'Next page' });
    fireEvent.click(nextButton);
    expect(onPageChange).toHaveBeenCalledWith(2);

    unmount();
  });
});

describe('DataTable — cursor pagination', () => {
  it('renders "Загрузить ещё" button and calls onLoadMore', () => {
    const onLoadMore = vi.fn();
    const { unmount } = render(
      <DataTable
        columns={columns}
        data={sampleData}
        pagination={{
          mode: 'cursor',
          hasMore: true,
          onLoadMore,
        }}
      />,
    );

    const cursorEl = screen.getByTestId('cursor-pagination');
    expect(cursorEl).toBeDefined();

    const loadMoreBtn = screen.getByRole('button', { name: 'Загрузить ещё' });
    expect(loadMoreBtn).toBeDefined();
    fireEvent.click(loadMoreBtn);
    expect(onLoadMore).toHaveBeenCalledTimes(1);

    unmount();
  });

  it('does not render pagination when hasMore is false', () => {
    const { unmount } = render(
      <DataTable
        columns={columns}
        data={sampleData}
        pagination={{
          mode: 'cursor',
          hasMore: false,
          onLoadMore: vi.fn(),
        }}
      />,
    );

    expect(screen.queryByTestId('cursor-pagination')).toBeNull();

    unmount();
  });

  it('does not show page numbers in cursor mode', () => {
    const { unmount } = render(
      <DataTable
        columns={columns}
        data={sampleData}
        pagination={{
          mode: 'cursor',
          hasMore: true,
          onLoadMore: vi.fn(),
        }}
      />,
    );

    expect(screen.queryByRole('button', { name: '1' })).toBeNull();
    expect(screen.queryByRole('button', { name: '2' })).toBeNull();

    unmount();
  });
});

describe('DataTable — filtered-empty vs empty', () => {
  it('renders filtered-empty state when isFiltered=true and data is empty', () => {
    const onResetFilters = vi.fn();
    const { unmount } = render(
      <DataTable columns={columns} data={[]} isFiltered={true} onResetFilters={onResetFilters} />,
    );

    const filteredEmpty = screen.getByTestId('filtered-empty');
    expect(filteredEmpty).toBeDefined();
    expect(filteredEmpty.textContent).toContain('Ничего не найдено по заданным фильтрам');

    const resetBtn = screen.getByRole('button', { name: 'Сбросить фильтры' });
    expect(resetBtn).toBeDefined();
    fireEvent.click(resetBtn);
    expect(onResetFilters).toHaveBeenCalledTimes(1);

    unmount();
  });

  it('renders empty state when isFiltered=false and data is empty', () => {
    const { unmount } = render(<DataTable columns={columns} data={[]} isFiltered={false} />);

    const emptyState = screen.getByTestId('empty-state');
    expect(emptyState).toBeDefined();
    expect(emptyState.textContent).toContain('Ничего не найдено');

    expect(screen.queryByTestId('filtered-empty')).toBeNull();

    unmount();
  });

  it('renders custom empty title/description', () => {
    const { unmount } = render(
      <DataTable
        columns={columns}
        data={[]}
        emptyTitle="Пока детей нет"
        emptyDescription="Создайте первую карточку"
      />,
    );

    const emptyState = screen.getByTestId('empty-state');
    expect(emptyState.textContent).toContain('Пока детей нет');
    expect(emptyState.textContent).toContain('Создайте первую карточку');

    unmount();
  });
});

describe('DataTable — loading state', () => {
  it('renders skeleton rows when isLoading=true', () => {
    const { unmount, container } = render(
      <DataTable columns={columns} data={[]} isLoading={true} skeletonRowCount={3} />,
    );

    const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);

    unmount();
  });
});

describe('DataTable — error state', () => {
  it('renders error message and retry button', () => {
    const onRetry = vi.fn();
    const { unmount } = render(
      <DataTable columns={columns} data={[]} isError={true} onRetry={onRetry} />,
    );

    expect(screen.getByText('Не удалось загрузить данные')).toBeDefined();
    const retryBtn = screen.getByRole('button', { name: 'Повторить' });
    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalledTimes(1);

    unmount();
  });
});
