import { useEffect, useState } from 'react';

/**
 * Trails a value by `delay` milliseconds.
 *
 * Used by the search box: the index is fast enough to query on every keystroke,
 * but re-rendering a long result list on each one is not, and the flicker reads
 * as lag.
 */
export function useDebouncedValue<T>(value: T, delay = 180): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timeout);
  }, [value, delay]);

  return debounced;
}
