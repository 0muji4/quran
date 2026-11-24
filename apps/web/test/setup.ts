import '@testing-library/jest-dom/vitest';
import React from 'react';

// Make React available globally for JSX
globalThis.React = React;

// jsdom does not implement modal dialogs. These stand in for what the browser
// does: showModal opens the dialog and focuses its first control, and close
// closes it and queues a close event.
HTMLDialogElement.prototype.showModal = function showModal() {
  this.open = true;
  this.querySelector<HTMLElement>('input, select, textarea, button')?.focus();
};
HTMLDialogElement.prototype.close = function close() {
  if (!this.open) return;
  this.open = false;
  queueMicrotask(() => this.dispatchEvent(new Event('close')));
};
