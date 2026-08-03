import { useCallback, useEffect, useState } from 'react';

/**
 * State mirrored into localStorage.
 *
 * Every access is guarded: private browsing, disabled storage and quota errors
 * all throw, and none of them are worth crashing the app over — the feature
 * simply degrades to in-memory state.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((previous: T) => T)) => void, () => void] {
  const [stored, setStored] = useState<T>(() => read(key, initialValue));

  const setValue = useCallback(
    (value: T | ((previous: T) => T)) => {
      setStored((previous) => {
        const next = value instanceof Function ? value(previous) : value;
        write(key, next);
        return next;
      });
    },
    [key],
  );

  const remove = useCallback(() => {
    setStored(initialValue);
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignored: see above.
    }
  }, [key, initialValue]);

  // Keep tabs in sync — the app is realtime everywhere else, drafts included.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== key) return;
      setStored(read(key, initialValue));
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [key, initialValue]);

  return [stored, setValue, remove];
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignored: storage being unavailable must never break a write path.
  }
}
