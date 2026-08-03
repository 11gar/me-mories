import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { createId } from '@/lib/id';
import { Toast } from '@/ui';

import { ToastContext } from './toastContext';
import type { ToastOptions, ToastRecord } from './toastContext';
import styles from './ToastProvider.module.scss';

const DEFAULT_DURATION = 5_000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismissToast = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      timers.current.delete(id);
    }

    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, options: ToastOptions = {}) => {
      const id = createId();
      const duration = options.duration === undefined ? DEFAULT_DURATION : options.duration;

      setToasts((current) => [...current, { id, message, ...options }]);

      if (duration !== null) {
        timers.current.set(
          id,
          setTimeout(() => dismissToast(id), duration),
        );
      }

      return id;
    },
    [dismissToast],
  );

  const value = useMemo(
    () => ({ toasts, showToast, dismissToast }),
    [toasts, showToast, dismissToast],
  );

  return (
    <ToastContext value={value}>
      {children}

      {createPortal(
        // aria-live so a toast is announced without stealing focus — which
        // matters most for the undo affordance after a deletion. `aria-live`
        // alone carries the behaviour; `role="status"` would only restate it.
        <div className={styles.viewport} aria-live="polite">
          <AnimatePresence initial={false}>
            {toasts.map((toast) => (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.97 }}
                transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
              >
                <Toast
                  message={toast.message}
                  tone={toast.tone}
                  actionLabel={toast.action?.label}
                  onAction={
                    toast.action === undefined
                      ? undefined
                      : () => {
                          toast.action?.onClick();
                          dismissToast(toast.id);
                        }
                  }
                  onDismiss={() => dismissToast(toast.id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </ToastContext>
  );
}
