import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, cleanup, render, renderHook, screen } from '@testing-library/react';
import { useLocalStorageState, useStoredValue } from '../useLocalStorageState';

afterEach(cleanup);

describe('useStoredValue', () => {
  it('reads after mount, not during render', () => {
    const reader = vi.fn(() => 'stored');
    const seen: string[] = [];
    function Probe() {
      const [value] = useStoredValue(reader, 'initial');
      seen.push(value);
      return <p>{value}</p>;
    }

    render(<Probe />);

    expect(seen[0]).toBe('initial');
    expect(screen.getByText('stored')).toBeInTheDocument();
    expect(reader).toHaveBeenCalledTimes(1);
  });

  it('reads again with the latest reader only when readKey changes', () => {
    const { result, rerender } = renderHook(
      ({ id, version }: { id: string; version: number }) =>
        useStoredValue(() => `${id}-${version}`, 'initial', id),
      { initialProps: { id: 'a', version: 1 } }
    );
    expect(result.current[0]).toBe('a-1');

    rerender({ id: 'a', version: 2 });
    expect(result.current[0]).toBe('a-1');

    rerender({ id: 'b', version: 3 });
    expect(result.current[0]).toBe('b-3');
  });

  it('reads again on refresh and keeps a stable refresh callback', () => {
    let stored = 1;
    const { result, rerender } = renderHook(() => useStoredValue(() => stored, 0));
    const refresh = result.current[1];

    stored = 2;
    act(() => refresh());
    rerender();

    expect(result.current[0]).toBe(2);
    expect(result.current[1]).toBe(refresh);
  });

  it('keeps the previous value when the reader throws', () => {
    let fail = false;
    const { result } = renderHook(() =>
      useStoredValue(() => {
        if (fail) throw new Error('blocked');
        return 'stored';
      }, 'initial')
    );

    fail = true;
    act(() => result.current[1]());

    expect(result.current[0]).toBe('stored');
  });

  it('ignores writes from other tabs', () => {
    const reader = vi.fn(() => 'stored');
    renderHook(() => useStoredValue(reader, 'initial'));

    act(() => {
      window.dispatchEvent(new Event('storage'));
    });

    expect(reader).toHaveBeenCalledTimes(1);
  });
});

describe('useLocalStorageState', () => {
  it('follows writes from other tabs until unmount', () => {
    let stored = 'first';
    const reader = vi.fn(() => stored);
    const { result, unmount } = renderHook(() => useLocalStorageState(reader, 'initial'));
    expect(result.current[0]).toBe('first');

    stored = 'second';
    act(() => {
      window.dispatchEvent(new Event('storage'));
    });
    expect(result.current[0]).toBe('second');

    unmount();
    const callsAtUnmount = reader.mock.calls.length;
    window.dispatchEvent(new Event('storage'));
    expect(reader).toHaveBeenCalledTimes(callsAtUnmount);
  });
});
