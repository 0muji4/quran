import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { WelcomeBackToast } from '../WelcomeBackToast';
import messages from '../../../messages/en.json';

const nav = vi.hoisted(() => ({ search: '', replace: vi.fn() }));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(nav.search)
}));

vi.mock('../../../i18n/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ replace: nav.replace })
}));

const tree = () => (
  <NextIntlClientProvider locale="en" messages={messages}>
    <WelcomeBackToast />
  </NextIntlClientProvider>
);

beforeEach(() => {
  nav.search = '';
  nav.replace.mockReset();
});

afterEach(cleanup);

describe('WelcomeBackToast', () => {
  it('stays hidden without the query param', () => {
    render(tree());
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('strips the param after dismissal', () => {
    nav.search = 'welcome-back=1';
    render(tree());

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(nav.replace).toHaveBeenCalledWith('/', { scroll: false });
  });

  it('shows again when the param returns after a dismissal', () => {
    nav.search = 'welcome-back=1';
    const result = render(tree());
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));

    nav.search = '';
    result.rerender(tree());
    nav.search = 'welcome-back=1';
    result.rerender(tree());

    expect(screen.getByText('Welcome back')).toBeInTheDocument();
  });

  it('appears when the param arrives after mount', () => {
    const result = render(tree());

    nav.search = 'welcome-back=1';
    result.rerender(tree());

    expect(screen.getByText('Welcome back')).toBeInTheDocument();
  });
});
