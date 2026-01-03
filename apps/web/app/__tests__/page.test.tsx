import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import HomePage from '../page';

describe('HomePage', () => {
  it('renders the welcome message and recorder link', () => {
    render(<HomePage />);

    expect(screen.getByRole('heading', { name: 'Welcome' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Use the recorder to capture your recitation, upload it to the BFF, and request a scoring job without leaving the browser.'
      )
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to recorder' })).toBeInTheDocument();
  });

  it('supports accessible user navigation to the recorder link', async () => {
    const user = userEvent.setup();
    render(<HomePage />);

    const recorderLink = screen.getByRole('link', { name: 'Go to recorder' });

    await user.tab();
    expect(recorderLink).toHaveFocus();

    await user.click(recorderLink);
    expect(recorderLink).toHaveAttribute('href', '/record');
  });
});
