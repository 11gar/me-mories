import { useHotkey } from '@/hooks';
import { useUiStore } from '@/store';
import { Icon } from '@/ui';

import styles from './CaptureFab.module.scss';

/**
 * The always-available way into capture: a floating button, plus `n` from
 * anywhere in the app.
 *
 * `n` is bare rather than a chord because the whole promise is "a few seconds",
 * and it is safe: `useHotkey` ignores keystrokes aimed at a field, so typing
 * the letter n inside the capture box never re-triggers it.
 */
export function CaptureFab() {
  const openCapture = useUiStore((state) => state.openCapture);
  const captureOpen = useUiStore((state) => state.captureOpen);

  useHotkey('n', openCapture, { enabled: !captureOpen });

  return (
    <button type="button" className={styles.fab} onClick={openCapture} aria-keyshortcuts="n">
      <Icon name="plus" size={22} />
      <span className={styles.label}>Nouvelle mémoire</span>
    </button>
  );
}
