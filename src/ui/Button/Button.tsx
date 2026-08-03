import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';

import { cn } from '@/lib/cn';

import { Spinner } from '../Spinner/Spinner';
import styles from './Button.module.scss';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner and blocks interaction, without changing the button's
   * width — a button that resizes mid-submit makes the UI feel unstable. */
  loading?: boolean;
  fullWidth?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  fullWidth = false,
  iconLeft,
  iconRight,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        styles.button,
        styles[variant],
        styles[size],
        fullWidth && styles.fullWidth,
        loading && styles.loading,
        className,
      )}
      disabled={disabled === true || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <span className={styles.spinner}>
          <Spinner size={size === 'lg' ? 20 : 16} />
        </span>
      ) : null}

      <span className={styles.content}>
        {iconLeft}
        {children === undefined ? null : <span className={styles.label}>{children}</span>}
        {iconRight}
      </span>
    </button>
  );
}
