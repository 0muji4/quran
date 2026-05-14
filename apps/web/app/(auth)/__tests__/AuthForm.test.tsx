import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AuthForm } from '../AuthForm';

afterEach(() => cleanup());

const replace = vi.fn();
const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, refresh })
}));

const signInActionMock = vi.fn();
const signUpActionMock = vi.fn();

vi.mock('../../actions', () => ({
  signInAction: (...args: unknown[]) => signInActionMock(...args),
  signUpAction: (...args: unknown[]) => signUpActionMock(...args)
}));

const clearLocalCacheMock = vi.fn();
const refreshAllFromBffMock = vi.fn(async () => {});
const migrateAnonymousCacheToBffMock = vi.fn(async () => {});

vi.mock('../../lib/storage', () => ({
  clearLocalCache: () => clearLocalCacheMock(),
  refreshAllFromBff: () => refreshAllFromBffMock(),
  migrateAnonymousCacheToBff: () => migrateAnonymousCacheToBffMock()
}));

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
    migrateAnonymousCacheToBffMock.mockClear();
  });

  it('signs in with the entered credentials and routes home on success', async () => {
    signInActionMock.mockResolvedValueOnce({ id: 'u1', email: 'a@b.co', displayName: null });
    render(<AuthForm mode="signin" />);

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
    expect(migrateAnonymousCacheToBffMock).not.toHaveBeenCalled();
  });

  it('shows the BFF error when sign-in fails and stays on the form', async () => {
    signInActionMock.mockRejectedValueOnce(new Error('invalid email or password'));
    render(<AuthForm mode="signin" />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.co' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await screen.findByRole('alert');
    expect(screen.getByRole('alert')).toHaveTextContent('invalid email or password');
    expect(replace).not.toHaveBeenCalled();
  });

  it('runs the anonymous cache migration on sign-up before clearing the cache', async () => {
    const order: string[] = [];
    signUpActionMock.mockImplementationOnce(async () => {
      order.push('signUp');
      return { id: 'u4', email: 'a@b.co', displayName: null };
    });
    migrateAnonymousCacheToBffMock.mockImplementationOnce(async () => {
      order.push('migrate');
    });
    clearLocalCacheMock.mockImplementationOnce(() => {
      order.push('clear');
    });
    refreshAllFromBffMock.mockImplementationOnce(async () => {
      order.push('refresh');
    });

    render(<AuthForm mode="signup" />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.co' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'hunter2hunter2' } });
    acceptTerms();
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
    expect(order).toEqual(['signUp', 'migrate', 'clear', 'refresh']);
  });

  it('passes the optional display name through on sign-up', async () => {
    signUpActionMock.mockResolvedValueOnce({
      id: 'u2',
      email: 'a@b.co',
      displayName: 'Aisha'
    });
    render(<AuthForm mode="signup" />);

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
    render(<AuthForm mode="signup" />);

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

  it('blocks sign-up until the terms checkbox is accepted', async () => {
    signUpActionMock.mockResolvedValue({ id: 'u5', email: 'a@b.co', displayName: null });
    render(<AuthForm mode="signup" />);

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
    render(<AuthForm mode="signin" />);

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
    render(<AuthForm mode="signin" />);
    expect(screen.getByRole('button', { name: /google/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /apple/i })).toBeDisabled();
  });
});
