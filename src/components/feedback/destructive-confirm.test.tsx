// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { DestructiveConfirm } from './destructive-confirm';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        confirm_title: 'Подтвердите действие',
        confirm_destructive: 'Это действие необратимо',
        confirm_button: 'Подтвердить',
        reason_label: 'Причина',
        reason_placeholder: 'Укажите причину...',
        cancel: 'Отмена',
      };
      if (key === 'reason_counter' && opts) {
        return `${String(opts.count)}/${String(opts.max)}`;
      }
      return map[key] ?? key;
    },
  }),
}));

function getDialog() {
  return screen.getByRole('dialog');
}

function withinDialog() {
  const dialog = getDialog();
  return {
    getButton: (name: string) => {
      const buttons = dialog.querySelectorAll<HTMLButtonElement>('button');
      for (const btn of buttons) {
        if (btn.textContent?.includes(name)) return btn;
      }
      throw new Error(`Button "${name}" not found in dialog`);
    },
    getTextarea: () => {
      return dialog.querySelector('textarea') as HTMLTextAreaElement;
    },
    getCounterText: (text: string) => {
      const el = dialog.querySelector(`[class*="text-right"]`);
      return el?.textContent?.includes(text) ? el : null;
    },
  };
}

describe('DestructiveConfirm', () => {
  const onConfirm = vi.fn();
  const onOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders with default title and description', () => {
    render(<DestructiveConfirm open={true} onOpenChange={onOpenChange} onConfirm={onConfirm} />);

    const dialog = getDialog();
    expect(dialog.textContent).toContain('Подтвердите действие');
    expect(dialog.textContent).toContain('Это действие необратимо');
  });

  it('calls onConfirm without reason when requireReason=false', () => {
    render(<DestructiveConfirm open={true} onOpenChange={onOpenChange} onConfirm={onConfirm} />);

    const { getButton } = withinDialog();
    const confirmBtn = getButton('Подтвердить');
    expect(confirmBtn).not.toBeDisabled();
    fireEvent.click(confirmBtn);
    expect(onConfirm).toHaveBeenCalledWith(undefined);
  });

  it('shows reason textarea when requireReason=true', () => {
    render(
      <DestructiveConfirm
        open={true}
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
        requireReason
      />,
    );

    const { getTextarea } = withinDialog();
    const dialog = getDialog();
    expect(dialog.textContent).toContain('Причина');
    expect(getTextarea()).toBeTruthy();
  });

  it('disables confirm button until reason is valid when requireReason=true', () => {
    render(
      <DestructiveConfirm
        open={true}
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
        requireReason
      />,
    );

    const { getButton } = withinDialog();
    const confirmBtn = getButton('Подтвердить');
    expect(confirmBtn).toBeDisabled();
  });

  it('enables confirm button once reason meets minLen', async () => {
    const user = userEvent.setup();
    render(
      <DestructiveConfirm
        open={true}
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
        requireReason
        minLen={3}
      />,
    );

    const { getButton, getTextarea } = withinDialog();
    const textarea = getTextarea();
    await user.click(textarea);
    await user.type(textarea, 'abc');

    const confirmBtn = getButton('Подтвердить');
    expect(confirmBtn).not.toBeDisabled();
  });

  it('updates the character counter', async () => {
    const user = userEvent.setup();
    render(
      <DestructiveConfirm
        open={true}
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
        requireReason
        maxLen={500}
      />,
    );

    const { getTextarea, getCounterText } = withinDialog();
    expect(getCounterText('0/500')).toBeTruthy();

    const textarea = getTextarea();
    await user.click(textarea);
    await user.type(textarea, 'hello');

    expect(getCounterText('5/500')).toBeTruthy();
  });

  it('disables confirm when reason exceeds maxLen', async () => {
    const user = userEvent.setup();
    render(
      <DestructiveConfirm
        open={true}
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
        requireReason
        maxLen={5}
      />,
    );

    const { getButton, getTextarea } = withinDialog();
    const textarea = getTextarea();
    await user.click(textarea);
    await user.type(textarea, 'too long text');

    const confirmBtn = getButton('Подтвердить');
    expect(confirmBtn).toBeDisabled();
  });

  it('calls onConfirm with trimmed reason when requireReason=true', async () => {
    const user = userEvent.setup();
    render(
      <DestructiveConfirm
        open={true}
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
        requireReason
      />,
    );

    const { getButton, getTextarea } = withinDialog();
    const textarea = getTextarea();
    await user.click(textarea);
    await user.type(textarea, '  valid reason  ');

    const confirmBtn = getButton('Подтвердить');
    fireEvent.click(confirmBtn);

    expect(onConfirm).toHaveBeenCalledWith('valid reason');
  });

  it('respects custom maxLen in counter display', async () => {
    const user = userEvent.setup();
    render(
      <DestructiveConfirm
        open={true}
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
        requireReason
        maxLen={100}
      />,
    );

    const { getTextarea, getCounterText } = withinDialog();
    expect(getCounterText('0/100')).toBeTruthy();

    const textarea = getTextarea();
    await user.click(textarea);
    await user.type(textarea, 'ab');

    expect(getCounterText('2/100')).toBeTruthy();
  });
});
