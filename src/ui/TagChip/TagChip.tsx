import type { MouseEventHandler } from 'react';

import { cn } from '@/lib/cn';

import { Icon } from '../Icon/Icon';
import styles from './TagChip.module.scss';

export interface TagChipProps {
  label: string;
  /** Hex colour driving the chip tint. Omit for a neutral chip (date tags). */
  color?: string;
  icon?: 'tag' | 'calendar' | 'sparkles';
  size?: 'sm' | 'md';
  /** Marks a tag that does not exist yet and will be created on save. */
  isNew?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  onRemove?: () => void;
  removeLabel?: string;
  selected?: boolean;
  className?: string;
}

export function TagChip({
  label,
  color,
  icon,
  size = 'md',
  isNew = false,
  onClick,
  onRemove,
  removeLabel,
  selected = false,
  className,
}: TagChipProps) {
  const interactive = onClick !== undefined;

  // The tag colour drives a tinted background and matching text via
  // color-mix, so a chip stays legible in both themes without storing two
  // colours per tag.
  const style =
    color === undefined ? undefined : ({ '--chip-color': color } as React.CSSProperties);

  const content = (
    <>
      {icon === undefined ? null : <Icon name={icon} size={size === 'sm' ? 12 : 14} />}
      <span className={styles.label}>{label}</span>
      {isNew ? <span className={styles.badge}>nouveau</span> : null}
    </>
  );

  return (
    <span
      className={cn(
        styles.chip,
        styles[size],
        color !== undefined && styles.colored,
        selected && styles.selected,
        className,
      )}
      style={style}
    >
      {interactive ? (
        <button type="button" className={styles.main} onClick={onClick}>
          {content}
        </button>
      ) : (
        <span className={styles.main}>{content}</span>
      )}

      {onRemove === undefined ? null : (
        <button
          type="button"
          className={styles.remove}
          onClick={onRemove}
          aria-label={removeLabel ?? `Retirer ${label}`}
        >
          <Icon name="close" size={12} />
        </button>
      )}
    </span>
  );
}
