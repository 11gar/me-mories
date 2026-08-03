import { useId } from 'react';
import type { InputHTMLAttributes, ReactNode, Ref, TextareaHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

import styles from './Field.module.scss';

interface FieldShellProps {
  label: string;
  hint?: string;
  error?: string;
  /** Visually hides the label while keeping it for screen readers. */
  hideLabel?: boolean;
  htmlFor: string;
  describedById: string;
  children: ReactNode;
  className?: string;
}

function FieldShell({
  label,
  hint,
  error,
  hideLabel = false,
  htmlFor,
  describedById,
  children,
  className,
}: FieldShellProps) {
  return (
    <div className={cn(styles.field, className)}>
      <label className={cn(styles.label, hideLabel && styles.srOnly)} htmlFor={htmlFor}>
        {label}
      </label>

      {children}

      {error === undefined ? (
        hint === undefined ? null : (
          <p className={styles.hint} id={describedById}>
            {hint}
          </p>
        )
      ) : (
        // role="alert" so the message is announced the moment it appears,
        // rather than only when focus happens to land on the field.
        <p className={styles.error} id={describedById} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  hint?: string;
  error?: string;
  hideLabel?: boolean;
  fieldClassName?: string;
  ref?: Ref<HTMLInputElement>;
}

export function Input({
  label,
  hint,
  error,
  hideLabel,
  fieldClassName,
  className,
  ...rest
}: InputProps) {
  const id = useId();
  const describedById = `${id}-description`;
  const described = error !== undefined || hint !== undefined;

  return (
    <FieldShell
      label={label}
      hint={hint}
      error={error}
      hideLabel={hideLabel}
      htmlFor={id}
      describedById={describedById}
      className={fieldClassName}
    >
      <input
        id={id}
        className={cn(styles.control, error !== undefined && styles.invalid, className)}
        aria-invalid={error === undefined ? undefined : true}
        aria-describedby={described ? describedById : undefined}
        {...rest}
      />
    </FieldShell>
  );
}

export interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> {
  label: string;
  hint?: string;
  error?: string;
  hideLabel?: boolean;
  fieldClassName?: string;
  ref?: Ref<HTMLTextAreaElement>;
}

export function Textarea({
  label,
  hint,
  error,
  hideLabel,
  fieldClassName,
  className,
  rows = 4,
  ...rest
}: TextareaProps) {
  const id = useId();
  const describedById = `${id}-description`;
  const described = error !== undefined || hint !== undefined;

  return (
    <FieldShell
      label={label}
      hint={hint}
      error={error}
      hideLabel={hideLabel}
      htmlFor={id}
      describedById={describedById}
      className={fieldClassName}
    >
      <textarea
        id={id}
        rows={rows}
        className={cn(
          styles.control,
          styles.textarea,
          error !== undefined && styles.invalid,
          className,
        )}
        aria-invalid={error === undefined ? undefined : true}
        aria-describedby={described ? describedById : undefined}
        {...rest}
      />
    </FieldShell>
  );
}
