// @vitest-environment jsdom
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
        'datatable:no_results': 'Ничего не найдено',
        'datatable:no_results_filter': 'Ничего не найдено по заданным фильтрам',
        'datatable:loading': 'Загрузка данных...',
        'datatable:error': 'Не удалось загрузить данные',
        'datatable:load_more': 'Загрузить ещё',
        'datatable:reset_filters': 'Сбросить фильтры',
        'datatable:page_x_of_y': `Стр. ${params?.page ?? ''} из ${params?.total ?? ''}`,
        'common:actions.retry': 'Повторить',
      };
      const fullKey = key.includes(':') ? key : `${ns ?? 'datatable'}:${key}`;
      return translations[fullKey] ?? key;
    },
    i18n: { language: 'ru', changeLanguage: vi.fn() },
  }),
}));

const { DataTableMobile } = await import('./data-table-mobile');

interface TestRow {
  id: string;
  name: string;
  group: string;
}

const columns: ColumnDef<TestRow, unknown>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'group', header: 'Group' },
];

const sampleData: TestRow[] = [
  { id: '1', name: 'Alice', group: 'A' },
  { id: '2', name: 'Bob', group: 'B' },
  { id: '3', name: 'Charlie', group: 'C' },
];

describe('DataTableMobile — rendering', () => {
  beforeAll(() => {
    cleanup();
  });

  it('renders a card-list with one row per data item (no <table>)', () => {
    const { unmount, container } = render(
      <DataTableMobile columns={columns} data={sampleData} mobileListAriaLabel="children" />,
    );

    expect(container.querySelector('table')).toBeNull();
    const list = screen.getByRole('list', { name: 'children' });
    expect(list).toBeDefined();
    expect(screen.getAllByTestId('data-table-mobile-row').length).toBe(3);
    expect(container.textContent).toContain('Alice');
    expect(container.textContent).toContain('Charlie');

    unmount();
  });

  it('uses renderMobileRow when provided', () => {
    const renderMobileRow = vi.fn((row: TestRow) => (
      <div className="m-list-row" data-testid="custom-row">
        <div>{row.id}</div>
        <div>{row.name.toUpperCase()}</div>
        <div>{row.group}</div>
      </div>
    ));

    const { unmount, container } = render(
      <DataTableMobile columns={columns} data={sampleData} renderMobileRow={renderMobileRow} />,
    );

    expect(renderMobileRow).toHaveBeenCalledTimes(3);
    expect(screen.getAllByTestId('custom-row').length).toBe(3);
    expect(container.textContent).toContain('ALICE');

    unmount();
  });

  it('calls onRowClick when a card is tapped', () => {
    const onRowClick = vi.fn();
    const { unmount } = render(
      <DataTableMobile columns={columns} data={sampleData} onRowClick={onRowClick} />,
    );

    const rows = screen.getAllByTestId('data-table-mobile-row');
    fireEvent.click(rows[1]!);
    expect(onRowClick).toHaveBeenCalledWith(sampleData[1]);

    unmount();
  });
});

describe('DataTableMobile — states', () => {
  it('renders skeletons in loading state', () => {
    const { unmount, container } = render(
      <DataTableMobile columns={columns} data={[]} isLoading={true} skeletonRowCount={4} />,
    );

    const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
    expect(screen.queryAllByTestId('data-table-mobile-row').length).toBe(0);

    unmount();
  });

  it('renders error state with retry', () => {
    const onRetry = vi.fn();
    const { unmount } = render(
      <DataTableMobile columns={columns} data={[]} isError={true} onRetry={onRetry} />,
    );

    expect(screen.getByText('Не удалось загрузить данные')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));
    expect(onRetry).toHaveBeenCalledTimes(1);

    unmount();
  });

  it('renders empty state', () => {
    const { unmount } = render(
      <DataTableMobile columns={columns} data={[]} emptyTitle="Пока пусто" />,
    );

    expect(screen.getByTestId('empty-state').textContent).toContain('Пока пусто');

    unmount();
  });

  it('renders filtered-empty state with reset', () => {
    const onResetFilters = vi.fn();
    const { unmount } = render(
      <DataTableMobile
        columns={columns}
        data={[]}
        isFiltered={true}
        onResetFilters={onResetFilters}
      />,
    );

    expect(screen.getByTestId('filtered-empty')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Сбросить фильтры' }));
    expect(onResetFilters).toHaveBeenCalledTimes(1);

    unmount();
  });
});

describe('DataTableMobile — pagination', () => {
  it('renders compact offset pager with prev/next and "Стр. X из Y"', () => {
    const onPageChange = vi.fn();
    const { unmount } = render(
      <DataTableMobile
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

    const pager = screen.getByTestId('offset-pagination-mobile');
    expect(pager.textContent).toContain('Стр. 1 из 3');

    const prev = screen.getByRole('button', { name: 'Previous page' });
    expect((prev as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPageChange).toHaveBeenCalledWith(2);

    unmount();
  });

  it('hides offset pager when there is only one page', () => {
    const { unmount } = render(
      <DataTableMobile
        columns={columns}
        data={sampleData}
        pagination={{
          mode: 'offset',
          page: 1,
          pageSize: 20,
          total: 3,
          onPageChange: vi.fn(),
        }}
      />,
    );

    expect(screen.queryByTestId('offset-pagination-mobile')).toBeNull();

    unmount();
  });

  it('renders "Load more" in cursor mode and calls onLoadMore', () => {
    const onLoadMore = vi.fn();
    const { unmount } = render(
      <DataTableMobile
        columns={columns}
        data={sampleData}
        pagination={{ mode: 'cursor', hasMore: true, onLoadMore }}
      />,
    );

    expect(screen.getByTestId('cursor-pagination-mobile')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Загрузить ещё' }));
    expect(onLoadMore).toHaveBeenCalledTimes(1);

    unmount();
  });

  it('does not render cursor pager when hasMore is false', () => {
    const { unmount } = render(
      <DataTableMobile
        columns={columns}
        data={sampleData}
        pagination={{ mode: 'cursor', hasMore: false, onLoadMore: vi.fn() }}
      />,
    );

    expect(screen.queryByTestId('cursor-pagination-mobile')).toBeNull();

    unmount();
  });
});
