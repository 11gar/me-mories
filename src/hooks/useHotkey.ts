import { useEffect, useRef } from 'react';

export interface HotkeyOptions {
  /** Require Ctrl (Windows/Linux) or Cmd (macOS). */
  meta?: boolean;
  shift?: boolean;
  enabled?: boolean;
  /**
   * Fire even while the user is typing in a field. Off by default — a bare "n"
   * shortcut must not hijack the letter n inside the capture box.
   */
  allowInInput?: boolean;
  preventDefault?: boolean;
}

const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return EDITABLE_TAGS.has(target.tagName) || target.isContentEditable;
}

/**
 * Binds a keyboard shortcut for as long as the component is mounted.
 *
 * The handler is kept in a ref so callers do not have to memoise it — passing
 * an inline arrow would otherwise rebind the listener on every render.
 */
export function useHotkey(
  key: string,
  handler: (event: KeyboardEvent) => void,
  options: HotkeyOptions = {},
): void {
  const {
    meta = false,
    shift = false,
    enabled = true,
    allowInInput = false,
    preventDefault = true,
  } = options;

  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== key.toLowerCase()) return;
      if (meta !== (event.metaKey || event.ctrlKey)) return;
      if (shift !== event.shiftKey) return;
      if (!allowInInput && isEditableTarget(event.target)) return;

      if (preventDefault) event.preventDefault();
      handlerRef.current(event);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [key, meta, shift, enabled, allowInInput, preventDefault]);
}
