'use client';

import { useEffect, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';

interface Props {
  id?: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

// h1 with one-shot programmatic focus on mount. Used at the top of the result
// page so that when RecorderPanel auto-redirects from /practice the screen
// reader announces what the new page is about, rather than leaving focus on
// a stale element. tabIndex={-1} keeps the heading out of the regular tab
// order while still allowing programmatic focus.
export function AutoFocusHeading({ id, className, style, children }: Props) {
  const ref = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.focus({ preventScroll: true });
  }, []);

  return (
    <h1 ref={ref} id={id} className={className} style={style} tabIndex={-1}>
      {children}
    </h1>
  );
}
