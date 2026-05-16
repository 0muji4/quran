import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { AuthForm } from '../AuthForm';
import messages from '../../../../messages/en.json';

afterEach(() => cleanup());

const replace = vi.fn();
const refresh = vi.fn();

vi.mock('../../../../i18n/navigation', () => ({
  Link: ({ children, ...props }: { children: React.ReactNode } & Record<string, unknown>) =>
    React.createElement('a', props, children),
  useRouter: () => ({ replace, refresh })
}));

const signInActionMock = vi.fn();
const signUpActionMock = vi.fn();

vi.mock('../../../actions', () => ({
  signInAction: (...args: unknown[]) => signInActionMock(...args),
  signUpAction: (...args: unknown[]) => signUpActionMock(...args)
}));

const clearLocalCacheMock = vi.fn();
const refreshAllFromBffMock = vi.fn(async () => {});

vi.mock('../../../lib/storage', () => ({
  clearLocalCache: () => clearLocalCacheMock(),
  refreshAllFromBff: () => refreshAllFromBffMock()
}));

// next-intl reads messages + locale from context. Wrap every render with
// the real en.json catalogue so existing English assertions ("Email",
// "Sign in", etc.) keep working without per-string mocking.
const renderForm = (props: React.ComponentProps<typeof AuthForm>) =>
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <AuthForm {...props} />
    </NextIntlClientProvider>
  );

// Accept the sign-up terms gate so a submission can go through. Kept as a
// helper because every sign-up flow now has to clear it first.
const acceptTerms = (): void => {
  fireEvent.click(screen.getByRole('checkbox', { name: /terms of service/i }));
};

describe('AuthForm', () => {
  beforeEach(() => {
    replace.mockReset();
    refresh.mockReset();
    signInActionMock.mockReset();
    signUpActionMock.mockReset();
    clearLocalCacheMock.mockReset();
    refreshAllFromBffMock.mockClear();
  });

  it('signs in with the entered credentials and routes home on success', async () => {
    signInActionMock.mockResolvedValueOnce({ id: 'u1', email: 'a@b.co', displayName: null });
    renderForm({ mode: 'signin' });

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.co' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'hunter2hunter2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() =>
      expect(signInActionMock).toHaveBeenCalledWith({
        email: 'a@b.co',
        password: 'hunter2hunter2'
      })
    );
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
    expect(refresh).toHaveBeenCalled();
    expect(clearLocalCacheMock).toHaveBeenCalled();
    expect(refreshAllFromBffMock).toHaveBeenCalled();
  });

  it('shows the BFF error when sign-in fails and stays on the form', async () => {
    signInActionMock.mockRejectedValueOnce(new Error('invalid email or password'));
    renderForm({ mode: 'signin' });

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.co' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await screen.findByRole('alert');
    expect(screen.getByRole('alert')).toHaveTextContent('invalid email or password');
    expect(replace).not.toHaveBeenCalled();
  });

  it('signs up then clears the local cache and pulls fresh BFF state', async () => {
    const order: string[] = [];
    signUpActionMock.mockImplementationOnce(async () => {
      order.push('signUp');
      return { id: 'u4', email: 'a@b.co', displayName: null };
    });
    clearLocalCacheMock.mockImplementationOnce(() => {
      order.push('clear');
    });
    refreshAllFromBffMock.mockImplementationOnce(async () => {
      order.push('refresh');
    });

    renderForm({ mode: 'signup' });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.co' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'hunter2hunter2' } });
    acceptTerms();
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
    expect(order).toEqual(['signUp', 'clear', 'refresh']);
  });

  it('passes the optional display name through on sign-up', async () => {
    signUpActionMock.mockResolvedValueOnce({
      id: 'u2',
      email: 'a@b.co',
      displayName: 'Aisha'
    });
    renderForm({ mode: 'signup' });

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.co' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'hunter2hunter2' } });
    fireEvent.change(screen.getByLabelText('Your name'), {
      target: { value: 'Aisha' }
    });
    acceptTerms();
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() =>
      expect(signUpActionMock).toHaveBeenCalledWith({
        email: 'a@b.co',
        password: 'hunter2hunter2',
        displayName: 'Aisha'
      })
    );
  });

  it('omits an empty display name on sign-up', async () => {
    signUpActionMock.mockResolvedValueOnce({ id: 'u3', email: 'a@b.co', displayName: null });
    renderForm({ mode: 'signup' });

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.co' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'hunter2hunter2' } });
    acceptTerms();
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() =>
      expect(signUpActionMock).toHaveBeenCalledWith({
        email: 'a@b.co',
        password: 'hunter2hunter2',
        displayName: undefined
      })
    );
  });

  it('blocks sign-up with passwords shorter than 8 characters', async () => {
    renderForm({ mode: 'signup' });

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.co' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'short' } });
    acceptTerms();
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(signUpActionMock).not.toHaveBeenCalled();
    expect(await screen.findByRole('alert')).toHaveTextContent(/at least 8 characters/i);
  });

  it('allows sign-in with any non-empty password regardless of length', async () => {
    // Existing accounts may have been created before the 8-char rule landed,
    // so sign-in must not enforce it client-side. The BFF lets them through.
    signInActionMock.mockResolvedValueOnce({ id: 'legacy', email: 'a@b.co', displayName: null });
    renderForm({ mode: 'signin' });

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.co' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'short' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(signInActionMock).toHaveBeenCalled());
  });

  it('blocks sign-up until the terms checkbox is accepted', async () => {
    signUpActionMock.mockResolvedValue({ id: 'u5', email: 'a@b.co', displayName: null });
    renderForm({ mode: 'signup' });

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.co' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'hunter2hunter2' } });

    // Submitting without accepting the terms is gated: no action, error shown.
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(signUpActionMock).not.toHaveBeenCalled();
    expect(await screen.findByRole('alert')).toHaveTextContent(/terms of service/i);

    // Accepting the terms clears the gate and lets the submission through.
    acceptTerms();
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    await waitFor(() => expect(signUpActionMock).toHaveBeenCalledTimes(1));
  });

  it('toggles password visibility with the Show / Hide control', () => {
    renderForm({ mode: 'signin' });

    const password = screen.getByLabelText('Password');
    expect(password).toHaveAttribute('type', 'password');

    const toggle = screen.getByRole('button', { name: 'Show password' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(toggle);
    expect(password).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Hide password' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('renders the deferred OAuth buttons as disabled placeholders', () => {
    renderForm({ mode: 'signin' });
    expect(screen.getByRole('button', { name: /google/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /apple/i })).toBeDisabled();
  });
});
