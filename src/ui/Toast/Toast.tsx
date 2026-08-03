import { cn } from '@/lib/cn';

import { Icon } from '../Icon/Icon';
import type { IconName } from '../Icon/Icon';
import styles from './Toast.module.scss';

export type ToastTone = 'neutral' | 'success' | 'danger';

export interface ToastProps {
  message: string;
  tone?: ToastTone;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  className?: string;
}

const TONE_ICON: Record<ToastTone, IconName> = {
  neutral: 'inbox',
  success: 'check',
  danger: 'alert',
};

export function Toast({
  message,
  tone = 'neutral',
  actionLabel,
  onAction,
  onDismiss,
  className,
}: ToastProps) {
  return (
    <div className={cn(styles.toast, styles[tone], className)}>
      <Icon name={TONE_ICON[tone]} size={18} className={styles.icon} />
      <p className={styles.message}>{message}</p>

      {actionLabel !== undefined && onAction !== undefined ? (
        <button type="button" className={styles.action} onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}

      {onDismiss === undefined ? null : (
        <button
          type="button"
          className={styles.dismiss}
          onClick={onDismiss}
          aria-label="Fermer la notification"
        >
          <Icon name="close" size={16} />
        </button>
      )}
    </div>
  );
}
