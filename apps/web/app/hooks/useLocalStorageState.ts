'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// SSR-safe: hydrates on mount only, so first paint always uses `initial`.
// This trades a brief flicker for hydration safety.
export function useLocalStorageState<T>(reader: () => T, initial: T): [T, () => void] {
  const [value, setValue] = useState<T>(initial);
  const readerRef = useRef(reader);
  readerRef.current = reader;

  const refresh = useCallback(() => {
    try {
      setValue(readerRef.current());
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    refresh();
    const onStorage = () => refresh();
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', onStorage);
      return () => window.removeEventListener('storage', onStorage);
    }
    return undefined;
  }, [refresh]);

  return [value, refresh];
}
