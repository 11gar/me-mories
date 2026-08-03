import { useId } from 'react';

import { cn } from '@/lib/cn';

import { Icon } from '../Icon/Icon';
import styles from './ColorPicker.module.scss';

export interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  colors: readonly string[];
  label: string;
  className?: string;
}

/**
 * A fixed palette rather than a free colour wheel.
 *
 * Native radios so arrow keys work and the group is announced properly; the
 * inputs are visually hidden and the swatch label is the control.
 */
export function ColorPicker({ value, onChange, colors, label, className }: ColorPickerProps) {
  const name = useId();

  return (
    <fieldset className={cn(styles.picker, className)}>
      <legend className={styles.legend}>{label}</legend>

      {colors.map((color) => (
        <label
          key={color}
          className={cn(styles.swatch, value === color && styles.selected)}
          style={{ background: color }}
        >
          <input
            type="radio"
            name={name}
            value={color}
            checked={value === color}
            onChange={() => onChange(color)}
            className={styles.input}
          />
          <span className={styles.srOnly}>{color}</span>
          {value === color ? <Icon name="check" size={14} className={styles.check} /> : null}
        </label>
      ))}
    </fieldset>
  );
}
