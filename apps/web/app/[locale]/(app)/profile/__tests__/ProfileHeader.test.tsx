import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ProfileHeader } from '../ProfileHeader';

vi.mock('../EditProfileButton', () => ({ EditProfileButton: () => null }));
vi.mock('../StreakBadge', () => ({ StreakBadge: () => null }));

afterEach(cleanup);

const props = {
  displayName: 'Amina',
  email: 'amina@example.test',
  level: 'intermediate' as const,
  createdAt: '2026-03-04T12:00:00.000Z'
};

describe('ProfileHeader', () => {
  it('shows the name, the email, the level and the month joined', () => {
    render(<ProfileHeader {...props} />);

    expect(screen.getByRole('heading', { name: 'Amina' })).toBeInTheDocument();
    expect(screen.getByText('amina@example.test')).toBeInTheDocument();
    expect(screen.getByText('Intermediate')).toBeInTheDocument();
    expect(screen.getByText('Joined March 2026')).toBeInTheDocument();
  });

  it('shows the email once when there is no name', () => {
    render(<ProfileHeader {...props} displayName={null} />);

    expect(screen.getAllByText('amina@example.test')).toHaveLength(1);
    expect(screen.getByRole('heading', { name: 'amina@example.test' })).toBeInTheDocument();
  });
});
