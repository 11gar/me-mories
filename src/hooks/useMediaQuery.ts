import { useSyncExternalStore } from 'react';

/**
 * Subscribes to a media query.
 *
 * `useSyncExternalStore` rather than `useEffect` + `useState`: it reads the
 * current match during render, so the first paint is already correct instead of
 * flashing the wrong layout for a frame.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = (onStoreChange: () => void) => {
    const list = window.matchMedia(query);
    list.addEventListener('change', onStoreChange);
    return () => list.removeEventListener('change', onStoreChange);
  };

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    // Server/prerender fallback: assume the mobile layout.
    () => false,
  );
}

/** Matches the `md` breakpoint in styles/_mixins.scss. */
export const useIsDesktop = (): boolean => useMediaQuery('(min-width: 48rem)');
