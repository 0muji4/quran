import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { AutoFocusHeading } from '../AutoFocusHeading';

afterEach(() => cleanup());

describe('AutoFocusHeading', () => {
  it('renders an h1 and pulls focus on mount so screen readers announce the result page', () => {
    const { container } = render(<AutoFocusHeading>Some work to do</AutoFocusHeading>);
    const h1 = container.querySelector('h1');
    expect(h1).not.toBeNull();
    expect(h1).toHaveTextContent('Some work to do');
    // tabIndex=-1 keeps the heading out of the regular tab order.
    expect(h1).toHaveAttribute('tabindex', '-1');
    // Programmatic focus landed on the heading.
    expect(document.activeElement).toBe(h1);
  });
});
