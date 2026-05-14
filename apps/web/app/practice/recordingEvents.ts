// Tiny pub/sub used to decouple TeacherPanel and RecorderPanel without a
// shared client-component parent. When a recording starts, RecorderPanel
// publishes; TeacherPanel pauses on receipt. Using a window CustomEvent
// keeps both panels independently mountable from the server component
// page.tsx, so the page tree stays RSC outside the two leaf panels.

const EVENT_NAME = 'tilawah:recording-started';

export function notifyRecordingStarted(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

export function onRecordingStarted(handler: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const listener: EventListener = () => handler();
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}
