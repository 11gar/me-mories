import type { ReactNode } from 'react';
import { BrowserRouter } from 'react-router';

import { AuthProvider } from './AuthProvider';
import { SyncProvider } from './SyncProvider';
import { ThemeProvider } from './ThemeProvider';
import { ToastProvider } from './ToastProvider';

/**
 * Provider order matters: theme first so nothing renders unstyled, then toasts
 * so everything below can report failures through them, then auth, then sync —
 * which needs a user id — and finally routing.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <SyncProvider>
            <BrowserRouter>{children}</BrowserRouter>
          </SyncProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
