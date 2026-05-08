import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ListenBack } from '../ListenBack';

afterEach(() => cleanup());

describe('ListenBack', () => {
  it('renders both teacher and user players when both URLs are provided', () => {
    const { container } = render(
      <ListenBack teacherUrl="https://t/audio.mp3" userRecordingUrl="https://u/audio.webm" />
    );
    expect(screen.getByText('Listen back')).toBeInTheDocument();
    expect(screen.getByText('Teacher')).toBeInTheDocument();
    expect(screen.getByText('Your recitation')).toBeInTheDocument();
    const audios = container.querySelectorAll('audio');
    expect(audios).toHaveLength(2);
    expect(audios[0]).toHaveAttribute('src', 'https://t/audio.mp3');
    expect(audios[1]).toHaveAttribute('src', 'https://u/audio.webm');
  });

  it('shows the teacher player and a muted "not available" tile when user URL is null', () => {
    const { container } = render(
      <ListenBack teacherUrl="https://t/audio.mp3" userRecordingUrl={null} />
    );
    expect(screen.getByText('Teacher')).toBeInTheDocument();
    expect(screen.getByText(/no longer accessible/)).toBeInTheDocument();
    const audios = container.querySelectorAll('audio');
    expect(audios).toHaveLength(1);
    expect(audios[0]).toHaveAttribute('src', 'https://t/audio.mp3');
  });

  it('hides the teacher tile when teacher URL is null but keeps the user tile', () => {
    const { container } = render(
      <ListenBack teacherUrl={null} userRecordingUrl="https://u/audio.webm" />
    );
    expect(screen.queryByText('Teacher')).not.toBeInTheDocument();
    expect(screen.getByText('Your recitation')).toBeInTheDocument();
    const audios = container.querySelectorAll('audio');
    expect(audios).toHaveLength(1);
  });

  it('renders nothing when both URLs are null', () => {
    const { container } = render(<ListenBack teacherUrl={null} userRecordingUrl={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
