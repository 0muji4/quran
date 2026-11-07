import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { CompletionToast } from '../CompletionToast';
import messages from '../../../../../messages/en.json';

const nav = vi.hoisted(() => ({ search: '', replace: vi.fn() }));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(nav.search)
}));

vi.mock('../../../../../i18n/navigation', () => ({
  usePathname: () => '/library',
  useRouter: () => ({ replace: nav.replace })
}));

const tree = () => (
  <NextIntlClientProvider locale="en" messages={messages}>
    <CompletionToast />
  </NextIntlClientProvider>
);

const dismiss = () => fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));

beforeEach(() => {
  nav.search = '';
  nav.replace.mockReset();
});

afterEach(cleanup);

describe('CompletionToast', () => {
  it('stays hidden without the query param', () => {
    render(tree());
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows the toast and strips only its own param after dismissal', () => {
    nav.search = 'completed=Al-Fatihah&tab=all';
    render(tree());
    expect(screen.getByText('Al-Fatihah completed')).toBeInTheDocument();
    expect(nav.replace).not.toHaveBeenCalled();

    dismiss();

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(nav.replace).toHaveBeenCalledWith('/library?tab=all', { scroll: false });
  });

  it('shows again when the same surah is completed after a dismissal', () => {
    nav.search = 'completed=Al-Fatihah';
    const result = render(tree());
    dismiss();

    nav.search = '';
    result.rerender(tree());
    nav.search = 'completed=Al-Fatihah';
    result.rerender(tree());

    expect(screen.getByText('Al-Fatihah completed')).toBeInTheDocument();
  });

  it('shows a different surah that arrives before the strip lands', () => {
    nav.search = 'completed=Al-Fatihah';
    const result = render(tree());
    dismiss();

    nav.search = 'completed=Al-Ikhlas';
    result.rerender(tree());

    expect(screen.getByText('Al-Ikhlas completed')).toBeInTheDocument();
  });
});
