'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// SSR-safe: reads after mount only, so first paint always uses `initial`.
// This trades a brief flicker for hydration safety. The reads stay in an
// effect, not `useSyncExternalStore`, because the `lib/storage` getters also
// start a background BFF refresh and so must not run during render.
//
// Reads again when `readKey` changes. The returned callback forces a read.
export function useStoredValue<T>(reader: () => T, initial: T, readKey?: unknown): [T, () => void] {
  const [value, setValue] = useState<T>(initial);
  const readerRef = useRef(reader);
  useEffect(() => {
    readerRef.current = reader;
  });

  const refresh = useCallback(() => {
    try {
      setValue(readerRef.current());
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, readKey]);

  return [value, refresh];
}

// `useStoredValue` that also follows writes from other tabs.
export function useLocalStorageState<T>(reader: () => T, initial: T): [T, () => void] {
  const [value, refresh] = useStoredValue(reader, initial);

  useEffect(() => {
    const onStorage = () => refresh();
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', onStorage);
      return () => window.removeEventListener('storage', onStorage);
    }
    return undefined;
  }, [refresh]);

  return [value, refresh];
}
