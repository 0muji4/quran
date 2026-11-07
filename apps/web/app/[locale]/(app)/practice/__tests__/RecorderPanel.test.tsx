import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { RecorderPanel } from '../RecorderPanel';
import type { Attempt } from '../../../../lib/storage';
import type { AyahRecord, SurahSummary } from '../../../../lib/types';
import messages from '../../../../../messages/en.json';

interface FakeJobState {
  stage: 'idle' | 'uploading' | 'scoring' | 'done' | 'error';
  job: { jobId: string; status: string; score?: number } | null;
  error: string | null;
}

const IDLE_JOB: FakeJobState = { stage: 'idle', job: null, error: null };

const fakes = vi.hoisted(() => ({
  blob: null as Blob | null,
  setElapsedMs: null as ((elapsedMs: number) => void) | null,
  setJob: null as ((state: FakeJobState) => void) | null,
  router: { push: vi.fn() },
  start: vi.fn(),
  cancel: vi.fn(),
  submit: vi.fn(),
  reset: vi.fn(),
  getRecentAttempts: vi.fn<() => Attempt[]>(),
  recordAttempt: vi.fn(),
  recordBestScore: vi.fn(),
  setLastPracticed: vi.fn()
}));

vi.mock('../../../../hooks/useRecorder', () => ({
  useRecorder: () => {
    const [isRecording, setIsRecording] = React.useState(false);
    const [elapsedMs, setElapsedMs] = React.useState(0);
    fakes.setElapsedMs = setElapsedMs;
    return {
      isRecording,
      elapsedMs,
      levels: [],
      error: null,
      start: async () => {
        fakes.start();
        setIsRecording(true);
      },
      stop: async () => {
        setIsRecording(false);
        setElapsedMs(0);
        return fakes.blob;
      },
      cancel: fakes.cancel
    };
  }
}));

vi.mock('../../../../hooks/useScoringJob', () => ({
  useScoringJob: () => {
    const [state, setState] = React.useState<FakeJobState>(IDLE_JOB);
    fakes.setJob = setState;
    return {
      ...state,
      segments: [],
      submit: async (input: unknown) => {
        fakes.submit(input);
        setState({ stage: 'uploading', job: null, error: null });
      },
      reset: () => {
        fakes.reset();
        setState(IDLE_JOB);
      }
    };
  }
}));

vi.mock('../../../../lib/storage', () => ({
  getRecentAttempts: () => fakes.getRecentAttempts(),
  recordAttempt: (attempt: Attempt) => fakes.recordAttempt(attempt),
  recordBestScore: (...args: unknown[]) => fakes.recordBestScore(...args),
  setLastPracticed: (...args: unknown[]) => fakes.setLastPracticed(...args)
}));

vi.mock('../../../../../i18n/navigation', () => ({
  useRouter: () => fakes.router
}));

vi.mock('../../../../telemetry/use-ui-event', () => ({
  trackUiEvent: vi.fn()
}));

const surah = {
  id: '1',
  nameEn: 'Al-Fatihah',
  nameAr: 'الفاتحة',
  ayahCount: 7
} as SurahSummary;

const ayahRecord = (ayahNumber: number) => ({ ayahNumber }) as AyahRecord;

const panel = (ayahNumber = 1) => (
  <NextIntlClientProvider locale="en" messages={messages}>
    <RecorderPanel key={ayahNumber} surah={surah} ayah={ayahRecord(ayahNumber)} />
  </NextIntlClientProvider>
);

const attempt = (overrides: Partial<Attempt> = {}): Attempt => ({
  id: 'a1',
  surahId: '1',
  surahNameEn: 'Al-Fatihah',
  ayahNumber: 1,
  score: 72,
  jobId: 'a1',
  createdAt: new Date().toISOString(),
  status: 'COMPLETED',
  ...overrides
});

const click = async (name: string | RegExp) => {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name }));
  });
};

const tick = (elapsedMs: number) => act(() => fakes.setElapsedMs?.(elapsedMs));

const record = async (elapsedMs: number) => {
  await click('Start recording');
  tick(elapsedMs);
  await click('Stop recording');
};

const setJob = (state: FakeJobState) => act(() => fakes.setJob?.(state));

const REPLAY = 'Replay your recording';
const RECORD_AGAIN = 'Record again';

class FakeAudio extends EventTarget {
  static sources: string[] = [];
  constructor(src: string) {
    super();
    FakeAudio.sources.push(src);
  }
  play = () => Promise.resolve();
}

beforeEach(() => {
  fakes.blob = new Blob(['audio'], { type: 'audio/webm' });
  fakes.getRecentAttempts.mockReturnValue([]);
  FakeAudio.sources = [];
  vi.stubGlobal('Audio', FakeAudio);
  URL.createObjectURL = vi.fn(() => 'blob:recording');
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('RecorderPanel recording flow', () => {
  it('records, stops, and submits the recording for scoring', async () => {
    render(panel());
    expect(screen.getByRole('heading', { name: 'Now you recite' })).toBeInTheDocument();

    await click('Start recording');
    expect(screen.getByRole('heading', { name: 'Recording…' })).toBeInTheDocument();
    expect(fakes.setLastPracticed).toHaveBeenCalledTimes(1);

    tick(2_000);
    await click('Stop recording');

    expect(fakes.submit).toHaveBeenCalledWith({ blob: fakes.blob, surahId: '1', ayahNumber: 1 });
    expect(screen.getByRole('heading', { name: 'Analysing your recitation…' })).toBeInTheDocument();
  });

  it('rejects a short recording but still offers replay', async () => {
    render(panel());

    await record(600);

    expect(fakes.submit).not.toHaveBeenCalled();
    expect(screen.getByText('Recording was 0.6 s — too short to score')).toBeInTheDocument();

    await click(REPLAY);
    expect(URL.createObjectURL).toHaveBeenCalledWith(fakes.blob);
    expect(FakeAudio.sources).toEqual(['blob:recording']);
  });

  it('offers replay after a scoring failure', async () => {
    render(panel());
    await record(2_000);

    setJob({ stage: 'error', job: null, error: 'Upload failed' });

    expect(screen.getByText('Upload failed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: REPLAY })).toBeInTheDocument();
  });

  it('hides replay when no audio was captured', async () => {
    render(panel());
    await record(2_000);
    setJob({ stage: 'error', job: null, error: 'Upload failed' });
    await click(RECORD_AGAIN);

    fakes.blob = null;
    await click('Stop recording');
    setJob({ stage: 'error', job: null, error: 'Polling failed' });

    expect(screen.queryByRole('button', { name: REPLAY })).not.toBeInTheDocument();
  });

  it('starts over from the error card and replays the newest recording', async () => {
    render(panel());
    await record(600);

    await click(RECORD_AGAIN);
    expect(screen.getByRole('heading', { name: 'Recording…' })).toBeInTheDocument();
    expect(fakes.start).toHaveBeenCalledTimes(2);

    fakes.blob = new Blob(['second take'], { type: 'audio/webm' });
    tick(500);
    await click('Stop recording');

    await click(REPLAY);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(vi.mocked(URL.createObjectURL).mock.calls[0][0]).toBe(fakes.blob);
  });

  it('records the attempt and redirects once scoring completes', async () => {
    render(panel());
    await record(2_000);
    fakes.getRecentAttempts.mockReturnValue([attempt({ score: 85 })]);

    setJob({
      stage: 'done',
      job: { jobId: 'job-1', status: 'COMPLETED', score: 0.85 },
      error: null
    });

    expect(fakes.recordBestScore).toHaveBeenCalledWith('1', 1, 85);
    expect(fakes.recordAttempt).toHaveBeenCalledTimes(1);
    expect(fakes.recordAttempt.mock.calls[0][0]).toMatchObject({
      jobId: 'job-1',
      score: 85,
      status: 'COMPLETED',
      durationMs: 2_000
    });
    expect(fakes.router.push).toHaveBeenCalledTimes(1);
    expect(fakes.router.push).toHaveBeenCalledWith('/practice/1/1/result/job-1');
    expect(screen.getByRole('heading', { name: 'Analysing your recitation…' })).toBeInTheDocument();
  });

  it('logs a failed job without redirecting and keeps replay', async () => {
    render(panel());
    await record(2_000);

    setJob({ stage: 'error', job: { jobId: 'job-2', status: 'FAILED' }, error: 'Too noisy' });

    expect(fakes.recordBestScore).not.toHaveBeenCalled();
    expect(fakes.recordAttempt.mock.calls[0][0]).toMatchObject({ score: null, status: 'FAILED' });
    expect(fakes.router.push).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: REPLAY })).toBeInTheDocument();
  });
});

describe('RecorderPanel scoring timer', () => {
  const STUCK = 'Taking longer than usual';

  const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('shows the stuck hint at 30 seconds', async () => {
    render(panel());
    await record(2_000);

    advance(29_000);
    expect(screen.queryByText(STUCK)).not.toBeInTheDocument();

    advance(1_500);
    expect(screen.getByText(STUCK)).toBeInTheDocument();
  });

  it('restarts when the job moves from uploading to scoring', async () => {
    render(panel());
    await record(2_000);
    advance(31_000);
    expect(screen.getByText(STUCK)).toBeInTheDocument();

    setJob({ stage: 'scoring', job: null, error: null });
    expect(screen.queryByText(STUCK)).not.toBeInTheDocument();

    advance(29_000);
    expect(screen.queryByText(STUCK)).not.toBeInTheDocument();
  });

  it('stops ticking once the job leaves the busy stages', async () => {
    render(panel());
    await record(2_000);
    advance(31_000);

    setJob({
      stage: 'done',
      job: { jobId: 'job-1', status: 'COMPLETED', score: 0.9 },
      error: null
    });
    expect(screen.queryByText(STUCK)).not.toBeInTheDocument();

    advance(31_000);
    expect(screen.queryByText(STUCK)).not.toBeInTheDocument();
  });

  it('returns to idle and drops the recording when a stuck job is cancelled', async () => {
    render(panel());
    await record(2_000);
    advance(31_000);
    fakes.cancel.mockClear();

    await click('Cancel and try again');

    expect(fakes.cancel).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('heading', { name: 'Now you recite' })).toBeInTheDocument();

    setJob({ stage: 'error', job: null, error: 'Late failure' });
    expect(screen.queryByRole('button', { name: REPLAY })).not.toBeInTheDocument();
  });
});

describe('RecorderPanel last attempt footer', () => {
  it('shows the latest scored attempt for this ayah only', () => {
    fakes.getRecentAttempts.mockReturnValue([
      attempt({ id: 'other', ayahNumber: 2, score: 99 }),
      attempt({ id: 'failed', status: 'FAILED', score: null }),
      attempt({ id: 'match', score: 72 }),
      attempt({ id: 'older', score: 40 })
    ]);

    render(panel());

    expect(screen.getByTestId('last-attempt')).toHaveTextContent('Last attempt: 72 / 100');
  });

  it('reads the new ayah and clears the panel when the key changes', async () => {
    fakes.getRecentAttempts.mockReturnValue([attempt({ score: 72 })]);
    const result = render(panel(1));
    await record(600);
    expect(screen.getByRole('button', { name: RECORD_AGAIN })).toBeInTheDocument();

    fakes.getRecentAttempts.mockReturnValue([attempt({ ayahNumber: 2, score: 55 })]);
    result.rerender(panel(2));

    expect(screen.queryByRole('button', { name: RECORD_AGAIN })).not.toBeInTheDocument();
    expect(screen.getByTestId('last-attempt')).toHaveTextContent('Last attempt: 55 / 100');
  });

  it('re-reads after a scored attempt lands', async () => {
    render(panel());
    expect(screen.queryByTestId('last-attempt')).not.toBeInTheDocument();
    await record(2_000);

    fakes.getRecentAttempts.mockReturnValue([attempt({ score: 85 })]);
    setJob({
      stage: 'done',
      job: { jobId: 'job-1', status: 'COMPLETED', score: 0.85 },
      error: null
    });
    setJob(IDLE_JOB);

    expect(screen.getByTestId('last-attempt')).toHaveTextContent('Last attempt: 85 / 100');
  });
});
