import { useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';

import type { ThemePreference } from '@/domain/models';
import { useLocalStorage, useMediaQuery } from '@/hooks';

import { ThemeContext } from './themeContext';

const STORAGE_KEY = 'me-mories:theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useLocalStorage<ThemePreference>(STORAGE_KEY, 'system');
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');

  const resolved = preference === 'system' ? (prefersDark ? 'dark' : 'light') : preference;

  useEffect(() => {
    // The stylesheet keys off `data-theme`, so switching themes is one attribute
    // write — no re-render of the tree, no flash.
    document.documentElement.dataset['theme'] = resolved;
  }, [resolved]);

  const value = useMemo(
    () => ({ preference, resolved, setPreference }),
    [preference, resolved, setPreference],
  );

  return <ThemeContext value={value}>{children}</ThemeContext>;
}
