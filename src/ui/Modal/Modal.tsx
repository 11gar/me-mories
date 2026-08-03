import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

import { Icon } from '../Icon/Icon';
import styles from './Modal.module.scss';

/** Comfortably longer than the 200 ms leave animation. */
const EXIT_TIMEOUT_MS = 400;

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Hides the title visually while keeping it as the dialog's accessible name. */
  hideTitle?: boolean;
  description?: string;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  className?: string;
}

/**
 * A dialog that is a centred modal on desktop and a bottom sheet on mobile.
 *
 * Built on the native `<dialog>` + `showModal()`, which is worth far more than
 * it looks: focus trapping, focus restoration on close, Escape handling, the
 * top layer (no z-index fights) and an inert background all come from the
 * platform. Hand-rolling those is where custom design systems usually strand
 * keyboard users.
 *
 * The one thing the platform will not do is animate the exit, so the element
 * stays open until the leave animation finishes and only then calls `close()`.
 */
export function Modal({
  open,
  onClose,
  title,
  hideTitle = false,
  description,
  footer,
  size = 'md',
  children,
  className,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  // Trails `open`: turns true immediately on opening, false only once the exit
  // animation has played.
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }

    // Safety net. `onExitComplete` is the fast path, but an animation that is
    // interrupted — a backgrounded tab, a cancelled transition — would never
    // fire it, leaving the dialog open and holding focus hostage. A dialog must
    // never be able to get stuck open.
    const timeout = setTimeout(() => setMounted(false), EXIT_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return;

    if (mounted && !dialog.open) {
      dialog.showModal();
      document.body.dataset['scrollLocked'] = 'true';
    }

    if (!mounted && dialog.open) {
      dialog.close();
    }

    if (!mounted) {
      delete document.body.dataset['scrollLocked'];
    }
  }, [mounted]);

  useEffect(() => {
    return () => {
      delete document.body.dataset['scrollLocked'];
    };
  }, []);

  return (
    // Backdrop dismissal is a click on empty space, not an interactive control:
    // the keyboard equivalent is Escape, handled natively by <dialog>, and a
    // visible Close button exists regardless. jsx-a11y cannot see either.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={titleId}
      aria-describedby={description === undefined ? undefined : descriptionId}
      // Escape fires `cancel`; intercept it so closing always goes through the
      // caller rather than skipping its state update.
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      // The dialog fills the viewport, so a click landing on it rather than on
      // the panel is a backdrop click.
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
    >
      <AnimatePresence onExitComplete={() => setMounted(false)}>
        {open ? (
          <motion.div
            className={cn(styles.panel, styles[size], className)}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <header className={cn(styles.header, hideTitle && styles.headerBare)}>
              <div className={styles.heading}>
                <h2 id={titleId} className={cn(styles.title, hideTitle && styles.srOnly)}>
                  {title}
                </h2>
                {description === undefined ? null : (
                  <p id={descriptionId} className={styles.description}>
                    {description}
                  </p>
                )}
              </div>

              <button type="button" className={styles.close} onClick={onClose} aria-label="Fermer">
                <Icon name="close" size={18} />
              </button>
            </header>

            <div className={styles.body}>{children}</div>

            {footer === undefined ? null : <footer className={styles.footer}>{footer}</footer>}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </dialog>
  );
}
