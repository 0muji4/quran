import { afterEach, beforeAll, describe, it, expect, vi } from 'vitest';
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { ListenBack } from '../ListenBack';
import messages from '../../../../../../messages/en.json';

afterEach(() => cleanup());

const renderBack = (props: React.ComponentProps<typeof ListenBack>) =>
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <ListenBack {...props} />
    </NextIntlClientProvider>
  );

// jsdom does not implement HTMLMediaElement.play / pause; stub them so the
// "Play both" handler can drive the audio elements without throwing.
beforeAll(() => {
  Object.defineProperty(HTMLMediaElement.prototype, 'play', {
    configurable: true,
    value: vi.fn(() => Promise.resolve())
  });
  Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
    configurable: true,
    value: vi.fn()
  });
});

describe('ListenBack', () => {
  it('renders both teacher and user players when both URLs are provided', () => {
    const { container } = renderBack({
      teacherUrl: 'https://t/audio.mp3',
      userRecordingUrl: 'https://u/audio.webm'
    });
    expect(screen.getByText('Listen back')).toBeInTheDocument();
    expect(screen.getByText('Teacher')).toBeInTheDocument();
    expect(screen.getByText('Your recitation')).toBeInTheDocument();
    const audios = container.querySelectorAll('audio');
    expect(audios).toHaveLength(2);
    expect(audios[0]).toHaveAttribute('src', 'https://t/audio.mp3');
    expect(audios[1]).toHaveAttribute('src', 'https://u/audio.webm');
  });

  it('shows the teacher player and a muted "not available" tile when user URL is null', () => {
    const { container } = renderBack({
      teacherUrl: 'https://t/audio.mp3',
      userRecordingUrl: null
    });
    expect(screen.getByText('Teacher')).toBeInTheDocument();
    expect(screen.getByText(/no longer accessible/)).toBeInTheDocument();
    const audios = container.querySelectorAll('audio');
    expect(audios).toHaveLength(1);
    expect(audios[0]).toHaveAttribute('src', 'https://t/audio.mp3');
  });

  it('hides the teacher tile when teacher URL is null but keeps the user tile', () => {
    const { container } = renderBack({
      teacherUrl: null,
      userRecordingUrl: 'https://u/audio.webm'
    });
    expect(screen.queryByText('Teacher')).not.toBeInTheDocument();
    expect(screen.getByText('Your recitation')).toBeInTheDocument();
    const audios = container.querySelectorAll('audio');
    expect(audios).toHaveLength(1);
  });

  it('renders nothing when both URLs are null', () => {
    const { container } = renderBack({ teacherUrl: null, userRecordingUrl: null });
    expect(container).toBeEmptyDOMElement();
  });

  describe('Play both', () => {
    it('shows the Play both button only when both URLs are present', () => {
      renderBack({ teacherUrl: 'https://t', userRecordingUrl: 'https://u' });
      expect(screen.getByRole('button', { name: /play both/i })).toBeInTheDocument();
    });

    it('hides Play both when only teacher is available', () => {
      renderBack({ teacherUrl: 'https://t', userRecordingUrl: null });
      expect(screen.queryByRole('button', { name: /play both/i })).not.toBeInTheDocument();
    });

    it('hides Play both when only user is available', () => {
      renderBack({ teacherUrl: null, userRecordingUrl: 'https://u' });
      expect(screen.queryByRole('button', { name: /play both/i })).not.toBeInTheDocument();
    });

    it('plays the teacher first, then the user when teacher fires "ended"', async () => {
      const playSpy = vi.spyOn(HTMLMediaElement.prototype, 'play');
      playSpy.mockClear();

      const { container } = renderBack({
        teacherUrl: 'https://t',
        userRecordingUrl: 'https://u'
      });
      const [teacher, user] = Array.from(container.querySelectorAll('audio')) as HTMLAudioElement[];

      fireEvent.click(screen.getByRole('button', { name: /play both/i }));
      // After the click the teacher audio should have been started.
      expect(playSpy).toHaveBeenCalledTimes(1);
      // Wait for the queued play() promise to flush before firing ended.
      await Promise.resolve();

      // Simulate the teacher playback completing.
      teacher.dispatchEvent(new Event('ended'));
      // The user audio is then played.
      expect(playSpy).toHaveBeenCalledTimes(2);
      expect(user.currentTime).toBe(0);
    });
  });
});
