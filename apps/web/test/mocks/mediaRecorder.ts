import { vi } from 'vitest';

export class MockMediaRecorder {
  stream: MediaStream;
  mimeType: string;
  state: RecordingState = 'inactive';
  ondataavailable: ((event: BlobEvent) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onstart: (() => void) | null = null;
  onpause: (() => void) | null = null;
  onresume: (() => void) | null = null;

  constructor(stream: MediaStream, options?: MediaRecorderOptions) {
    this.stream = stream;
    this.mimeType = options?.mimeType || 'audio/webm';
  }

  start = vi.fn(() => {
    this.state = 'recording';
    if (this.onstart) {
      this.onstart();
    }
  });

  stop = vi.fn(() => {
    this.state = 'inactive';
    // Simulate data available event
    if (this.ondataavailable) {
      const blob = new Blob(['mock-audio-data'], { type: this.mimeType });
      const event = { data: blob } as BlobEvent;
      this.ondataavailable(event);
    }
    // Simulate stop event
    if (this.onstop) {
      this.onstop();
    }
  });

  pause = vi.fn(() => {
    this.state = 'paused';
  });

  resume = vi.fn(() => {
    this.state = 'recording';
  });

  requestData = vi.fn();

  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  dispatchEvent = vi.fn();
}

export const mockGetUserMedia = vi.fn();

export function setupMediaRecorderMock() {
  // Mock MediaRecorder
  global.MediaRecorder = MockMediaRecorder as any;

  // Mock navigator.mediaDevices.getUserMedia
  global.navigator = {
    ...global.navigator,
    mediaDevices: {
      getUserMedia: mockGetUserMedia.mockResolvedValue({
        getTracks: () => [
          {
            stop: vi.fn(),
            kind: 'audio',
            enabled: true
          }
        ],
        getAudioTracks: () => [],
        getVideoTracks: () => [],
        addTrack: vi.fn(),
        removeTrack: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
      } as any)
    } as any
  } as any;

  // Mock URL.createObjectURL
  global.URL.createObjectURL = vi.fn(() => 'blob:mock-audio-url');
  global.URL.revokeObjectURL = vi.fn();
}

export function resetMediaRecorderMock() {
  mockGetUserMedia.mockClear();
  if (global.MediaRecorder) {
    vi.clearAllMocks();
  }
}
