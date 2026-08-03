import { cn } from '@/lib/cn';

import styles from './Spinner.module.scss';

export interface SpinnerProps {
  size?: number;
  className?: string;
  /** Announce the wait to assistive tech. Omit inside a container that already
   * carries `aria-busy`. */
  label?: string;
}

export function Spinner({ size = 20, className, label }: SpinnerProps) {
  return (
    <span
      className={cn(styles.spinner, className)}
      style={{ width: size, height: size }}
      role={label === undefined ? undefined : 'status'}
      aria-label={label}
      aria-hidden={label === undefined ? true : undefined}
    />
  );
}
