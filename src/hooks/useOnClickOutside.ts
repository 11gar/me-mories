import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

/**
 * Calls back when a pointer goes down outside the referenced element.
 *
 * Listens on `pointerdown` rather than `click`: closing on mouse-up lets a drag
 * that starts inside and ends outside dismiss the popover, which feels broken.
 */
export function useOnClickOutside(
  ref: RefObject<HTMLElement | null>,
  handler: (event: PointerEvent) => void,
  enabled = true,
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled) return;

    const onPointerDown = (event: PointerEvent) => {
      const element = ref.current;
      if (element === null || event.target === null) return;
      if (element.contains(event.target as Node)) return;

      handlerRef.current(event);
    };

    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [ref, enabled]);
}
