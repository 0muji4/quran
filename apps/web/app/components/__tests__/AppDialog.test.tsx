import { afterEach, describe, expect, it, vi } from 'vitest';
import { StrictMode } from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { AppDialog } from '../AppDialog';

afterEach(cleanup);

const tree = (onClose: () => void) => (
  <AppDialog title="Title" onClose={onClose}>
    <button type="button">Action</button>
  </AppDialog>
);

describe('AppDialog', () => {
  it('opens as a modal named by its title', () => {
    render(tree(vi.fn()));
    expect(screen.getByRole('dialog', { name: 'Title' })).toHaveAttribute('open');
  });

  it('tells its owner when the browser closes it', async () => {
    const onClose = vi.fn();
    render(tree(onClose));

    await act(async () => screen.getByRole<HTMLDialogElement>('dialog').close());

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('stays open through the remount of strict mode', async () => {
    const onClose = vi.fn();
    render(<StrictMode>{tree(onClose)}</StrictMode>);

    await act(async () => {});

    expect(screen.getByRole('dialog')).toHaveAttribute('open');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes before it leaves the document, so focus can go back', () => {
    const result = render(tree(vi.fn()));
    const dialog = screen.getByRole<HTMLDialogElement>('dialog');
    const close = vi.spyOn(dialog, 'close').mockImplementation(() => {
      expect(dialog.isConnected).toBe(true);
    });

    result.unmount();

    expect(close).toHaveBeenCalledTimes(1);
  });
});
