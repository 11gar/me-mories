import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

import styles from './Page.module.scss';

export interface PageProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  /** `wide` for the calendar and tag grids; `reading` for memory lists, where a
   * narrow measure keeps long text legible. */
  width?: 'reading' | 'wide';
  children: ReactNode;
  className?: string;
}

export function Page({
  title,
  description,
  actions,
  width = 'reading',
  children,
  className,
}: PageProps) {
  return (
    <div className={cn(styles.page, styles[width], className)}>
      <header className={styles.header}>
        <div className={styles.heading}>
          <h1 className={styles.title}>{title}</h1>
          {description === undefined ? null : <p className={styles.description}>{description}</p>}
        </div>
        {actions === undefined ? null : <div className={styles.actions}>{actions}</div>}
      </header>

      {children}
    </div>
  );
}
