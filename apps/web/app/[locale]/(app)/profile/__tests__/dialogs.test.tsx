import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ChangeEmailButton } from '../ChangeEmailButton';
import { DeleteAccountButton } from '../DeleteAccountButton';
import { EditProfileButton } from '../EditProfileButton';
import { UpdatePasswordButton } from '../UpdatePasswordButton';

const actions = vi.hoisted(() => ({
  deleteAccountAction: vi.fn(),
  updateEmailAction: vi.fn(),
  updatePasswordAction: vi.fn(),
  updateProfileAction: vi.fn()
}));

vi.mock('../../../../actions', () => actions);

vi.mock('../../../../lib/storage', () => ({
  clearLocalCache: vi.fn()
}));

vi.mock('../../../../../i18n/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() })
}));

const open = (name: string) => fireEvent.click(screen.getByRole('button', { name }));

const type = (label: string | RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

const pressEscape = () => fireEvent.keyDown(window, { key: 'Escape' });

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ChangeEmailButton', () => {
  it('focuses the first field and clears the draft and error on reopen', () => {
    render(<ChangeEmailButton currentEmail="a@test.dev" />);

    open('Change');
    expect(screen.getByLabelText('New email')).toHaveFocus();
    type('New email', 'not-an-email');
    type('Current password', 'secret');
    fireEvent.click(screen.getByRole('button', { name: 'Update email' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid email address.');

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    open('Change');
    expect(screen.getByLabelText('New email')).toHaveValue('');
    expect(screen.getByLabelText('Current password')).toHaveValue('');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByLabelText('New email')).toHaveFocus();
  });
});

describe('UpdatePasswordButton', () => {
  it('wipes every password field on reopen', () => {
    render(<UpdatePasswordButton />);

    open('Update');
    expect(screen.getByLabelText('Current password')).toHaveFocus();
    type('Current password', 'old-password');
    type('New password', 'new-password');
    type('Confirm new password', 'other-password');
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }));
    expect(screen.getByRole('alert')).toBeInTheDocument();

    pressEscape();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    open('Update');
    expect(screen.getByLabelText('Current password')).toHaveValue('');
    expect(screen.getByLabelText('New password')).toHaveValue('');
    expect(screen.getByLabelText('Confirm new password')).toHaveValue('');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('DeleteAccountButton', () => {
  const submitButton = () =>
    within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete account' });

  it('clears the confirmation phrase on reopen', () => {
    render(<DeleteAccountButton />);

    open('Delete account');
    const confirmField = screen.getByLabelText(/below to confirm/);
    expect(confirmField).toHaveFocus();
    type(/below to confirm/, 'DELETE');
    expect(submitButton()).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Keep my account' }));
    open('Delete account');

    expect(screen.getByLabelText(/below to confirm/)).toHaveValue('');
    expect(submitButton()).toBeDisabled();
  });
});

describe('EditProfileButton', () => {
  const props = { displayName: 'Amina', email: 'a@test.dev', level: 'advanced' as const };

  it('restores the saved values on reopen', () => {
    render(<EditProfileButton {...props} />);

    open('Edit profile');
    expect(screen.getByLabelText('Display name')).toHaveFocus();
    type('Display name', 'Draft');
    type('Skill level', 'beginner');

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    open('Edit profile');

    expect(screen.getByLabelText('Display name')).toHaveValue('Amina');
    expect(screen.getByLabelText('Skill level')).toHaveValue('advanced');
  });

  it('prefills the latest props after the server refreshes them', () => {
    const result = render(<EditProfileButton {...props} />);

    result.rerender(<EditProfileButton {...props} displayName="Layla" />);
    open('Edit profile');

    expect(screen.getByLabelText('Display name')).toHaveValue('Layla');
  });

  it('sends only the changed fields', async () => {
    actions.updateProfileAction.mockResolvedValue(undefined);
    render(<EditProfileButton {...props} />);

    open('Edit profile');
    type('Display name', 'Layla');
    fireEvent.submit(screen.getByRole('dialog').querySelector('form') as HTMLFormElement);

    await waitFor(() =>
      expect(actions.updateProfileAction).toHaveBeenCalledWith({ displayName: 'Layla' })
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
