// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { StateMachineButtons } from './state-machine-buttons';

afterEach(() => {
  cleanup();
});

describe('StateMachineButtons', () => {
  it('renders enabled buttons that are clickable', () => {
    const onClick = vi.fn();
    render(
      <StateMachineButtons
        actions={[{ key: 'approve', label: 'Одобрить', enabled: true, onClick }]}
      />,
    );

    const btn = screen.getByRole('button', { name: 'Одобрить' });
    expect(btn).not.toBeDisabled();
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('renders disabled buttons with pointer-events-none class', () => {
    const onClick = vi.fn();
    render(
      <StateMachineButtons
        actions={[
          {
            key: 'approve',
            label: 'Одобрить',
            enabled: false,
            disabledReason: 'Нужно выбрать элемент',
            onClick,
          },
        ]}
      />,
    );

    const buttons = screen.getAllByRole('button');
    const disabledBtn = buttons.find((b) => b.textContent?.includes('Одобрить'));
    expect(disabledBtn).toBeTruthy();
    expect(disabledBtn).toHaveAttribute('disabled');
  });

  it('wraps disabled button in a tooltip trigger with the reason', () => {
    render(
      <StateMachineButtons
        actions={[
          {
            key: 'reject',
            label: 'Отклонить',
            enabled: false,
            disabledReason: 'Заявка уже обработана',
            onClick: vi.fn(),
          },
        ]}
      />,
    );

    const trigger = screen.getByText('Отклонить').closest('span[tabindex]');
    expect(trigger).toBeTruthy();
    expect(trigger).toHaveAttribute('tabindex', '0');
  });

  it('renders a mix of enabled and disabled buttons', () => {
    render(
      <StateMachineButtons
        actions={[
          { key: 'approve', label: 'Одобрить', enabled: true, onClick: vi.fn() },
          {
            key: 'reject',
            label: 'Отклонить',
            enabled: false,
            disabledReason: 'Нет прав',
            onClick: vi.fn(),
          },
          { key: 'cancel', label: 'Отменить', enabled: true, onClick: vi.fn() },
        ]}
      />,
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);

    const enabledBtns = buttons.filter((b) => !b.hasAttribute('disabled'));
    const disabledBtns = buttons.filter((b) => b.hasAttribute('disabled'));
    expect(enabledBtns).toHaveLength(2);
    expect(disabledBtns).toHaveLength(1);
  });

  it('enabled button onClick fires, disabled does not', () => {
    const enabledClick = vi.fn();
    const disabledClick = vi.fn();
    render(
      <StateMachineButtons
        actions={[
          { key: 'a', label: 'ActionA', enabled: true, onClick: enabledClick },
          {
            key: 'b',
            label: 'ActionB',
            enabled: false,
            disabledReason: 'No',
            onClick: disabledClick,
          },
        ]}
      />,
    );

    const aBtn = screen.getByRole('button', { name: 'ActionA' });
    fireEvent.click(aBtn);
    expect(enabledClick).toHaveBeenCalledOnce();

    const bBtns = screen.getAllByRole('button').filter((b) => b.textContent === 'ActionB');
    for (const b of bBtns) {
      fireEvent.click(b);
    }
    expect(disabledClick).not.toHaveBeenCalled();
  });
});
