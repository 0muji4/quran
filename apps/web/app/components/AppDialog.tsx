'use client';

import { useId, useLayoutEffect, useRef, type ReactNode } from 'react';
import { css } from '../../styled-system/css';

interface Props {
  title: string;
  /** Called when the user dismisses the dialog: Escape, or a press outside it. */
  onClose: () => void;
  children: ReactNode;
}

// A Material 3 basic dialog on the dialog element.
const dialogClass = css({
  width: '[calc(100% - 32px)]',
  maxWidth: '[480px]',
  maxHeight: '[calc(100% - 32px)]',
  margin: 'auto',
  padding: '0',
  borderWidth: '0',
  borderRadius: 'extraLarge',
  background: 'surfaceContainerHigh',
  color: 'onSurface',
  fontFamily: 'ui',
  boxShadow: 'level3',
  overflow: 'auto',
  '&::backdrop': { background: 'scrim', opacity: 0.32 }
});

const contentClass = css({ display: 'flex', flexDirection: 'column', gap: '4', padding: '6' });

const titleClass = css({ margin: '0', color: '[inherit]', textStyle: 'headlineSmall' });

/**
 * A modal dialog. Render it to open it and remove it to close it. The browser
 * moves focus in when it opens and back out when it closes, keeps the page
 * behind it inert, and closes it on Escape or, where it supports `closedby`, on
 * a press outside.
 */
export function AppDialog({ title, onClose, children }: Props) {
  const titleId = useId();
  const ref = useRef<HTMLDialogElement>(null);

  // A layout effect, so the dialog closes while it is still in the document
  // and the browser can give focus back.
  useLayoutEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  // The close event is queued, so it can arrive after a reopen.
  const handleClose = () => {
    if (!ref.current?.open) onClose();
  };

  return (
    <dialog
      ref={ref}
      className={dialogClass}
      aria-labelledby={titleId}
      closedby="any"
      onClose={handleClose}
    >
      <div className={contentClass}>
        <h2 id={titleId} className={titleClass}>
          {title}
        </h2>
        {children}
      </div>
    </dialog>
  );
}
