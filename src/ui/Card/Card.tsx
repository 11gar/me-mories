import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/cn';

import styles from './Card.module.scss';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** `raised` lifts the card off the page; `flat` keeps it inline. */
  elevation?: 'flat' | 'raised';
  interactive?: boolean;
  children: ReactNode;
}

export function Card({
  elevation = 'flat',
  interactive = false,
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn(styles.card, styles[elevation], interactive && styles.interactive, className)}
      {...rest}
    >
      {children}
    </div>
  );
}
