import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

import styles from './EmptyState.module.scss';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * An empty screen is where a user decides whether an app is worth their time.
 * Every empty state says what would be here and offers the next step.
 */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn(styles.root, className)}>
      {icon === undefined ? null : <div className={styles.icon}>{icon}</div>}
      <p className={styles.title}>{title}</p>
      {description === undefined ? null : <p className={styles.description}>{description}</p>}
      {action === undefined ? null : <div className={styles.action}>{action}</div>}
    </div>
  );
}
