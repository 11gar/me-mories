import { createContext, use } from 'react';

import type { ThemePreference } from '@/domain/models';

export interface ThemeContextValue {
  /** What the user chose — including "follow the system". */
  preference: ThemePreference;
  /** What is actually on screen right now. */
  resolved: 'light' | 'dark';
  setPreference: (preference: ThemePreference) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const value = use(ThemeContext);

  if (value === null) {
    throw new Error('useTheme doit être utilisé à l’intérieur de <ThemeProvider>.');
  }

  return value;
}
