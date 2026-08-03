import { createContext, use } from 'react';

import type { ToastTone } from '@/ui';

export interface ToastOptions {
  tone?: ToastTone;
  /** Milliseconds before auto-dismiss. Pass `null` to keep it until dismissed. */
  duration?: number | null;
  action?: { label: string; onClick: () => void };
}

export interface ToastRecord extends ToastOptions {
  id: string;
  message: string;
}

export interface ToastContextValue {
  toasts: ToastRecord[];
  /** Returns the toast id, so a caller can dismiss it early. */
  showToast: (message: string, options?: ToastOptions) => string;
  dismissToast: (id: string) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const value = use(ToastContext);

  if (value === null) {
    throw new Error('useToast doit être utilisé à l’intérieur de <ToastProvider>.');
  }

  return value;
}
