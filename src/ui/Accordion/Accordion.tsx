import { useState } from 'react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

import { Icon } from '../Icon/Icon';
import styles from './Accordion.module.scss';

export interface AccordionProps {
  /** Header content — a tag chip, a title, whatever names the group. */
  title: ReactNode;
  /** Right-aligned header slot, typically a count. */
  meta?: ReactNode;
  /** Uncontrolled initial state. Ignored when `open` is provided. */
  defaultOpen?: boolean;
  /** Controlled state, for callers that persist which groups are folded. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
  className?: string;
}

/**
 * A disclosure group, built on `<details>`/`<summary>`.
 *
 * Native for the same reason the Modal is a `<dialog>`: the element already
 * carries the semantics (the summary exposed as expandable, the group reported
 * as collapsed to assistive tech), keyboard operation, and — the part
 * hand-rolled accordions always lose — the browser opens a closed section when
 * its content matches a `Ctrl+F` search. Re-implementing that on a `<div>` and
 * a click handler is how people end up unable to find text that is on the page.
 *
 * There is no expand animation on purpose: `<details>` has no height to
 * transition from, and every workaround (measuring, `grid-template-rows`,
 * `max-height`) either fights the browser's own toggling or defeats the
 * find-in-page behaviour that made the native element worth using.
 */
export function Accordion({
  title,
  meta,
  defaultOpen = true,
  open,
  onOpenChange,
  children,
  className,
}: AccordionProps) {
  // Always driven by `open`, because React has no `defaultOpen` for <details>:
  // an uncontrolled one would drift out of sync with the DOM after a re-render.
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isOpen = open ?? uncontrolledOpen;

  return (
    <details
      className={cn(styles.group, className)}
      open={isOpen}
      onToggle={(event) => {
        const next = event.currentTarget.open;
        if (open === undefined) setUncontrolledOpen(next);
        onOpenChange?.(next);
      }}
    >
      <summary className={styles.summary}>
        <Icon name="chevronDown" size={16} className={styles.chevron} />
        <span className={styles.title}>{title}</span>
        {meta === undefined ? null : <span className={styles.meta}>{meta}</span>}
      </summary>

      <div className={styles.content}>{children}</div>
    </details>
  );
}
