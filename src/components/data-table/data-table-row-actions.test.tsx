// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { DataTableRowActions } = await import('./data-table-row-actions');

describe('DataTableRowActions', () => {
  it('does not leak body pointer-events:none after an item click', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <DataTableRowActions
        row={{ id: '1' }}
        actions={[
          {
            label: 'Open',
            onClick,
          },
        ]}
      />,
    );

    await user.click(screen.getByRole('button'));
    await user.click(await screen.findByText('Open'));

    expect(onClick).toHaveBeenCalledWith({ id: '1' });
    expect(document.body.style.pointerEvents).not.toBe('none');
  });
});
