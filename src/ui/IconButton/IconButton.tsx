import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';

import { cn } from '@/lib/cn';

import styles from './IconButton.module.scss';

export type IconButtonVariant = 'ghost' | 'surface' | 'primary' | 'danger';
export type IconButtonSize = 'sm' | 'md' | 'lg';

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Required: an icon-only control is invisible to screen readers without it. */
  label: string;
  icon: ReactNode;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  ref?: Ref<HTMLButtonElement>;
}

export function IconButton({
  label,
  icon,
  variant = 'ghost',
  size = 'md',
  className,
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(styles.button, styles[variant], styles[size], className)}
      {...rest}
    >
      {icon}
    </button>
  );
}
