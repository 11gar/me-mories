import type { SVGProps } from 'react';

/**
 * The whole icon set, as stroke paths on a 24×24 grid.
 *
 * Hand-rolled rather than pulled from a package: the app needs about twenty
 * glyphs, they all share one geometry, and a registry keeps them consistent
 * without shipping an icon library. Adding one is a single line here.
 */
const PATHS = {
  plus: 'M12 5v14M5 12h14',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM21 21l-4.35-4.35',
  home: 'M3 10.5 12 3l9 7.5M5.5 9.5V20a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9.5',
  calendar:
    'M8 2v4M16 2v4M3.5 9.5h17M5 4.5h14a1.5 1.5 0 0 1 1.5 1.5v13a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V6A1.5 1.5 0 0 1 5 4.5Z',
  layers: 'M12 3 3 8l9 5 9-5-9-5ZM3 16l9 5 9-5M3 12l9 5 9-5',
  tag: 'M3 3h7.6a2 2 0 0 1 1.4.6l8.4 8.4a2 2 0 0 1 0 2.8l-6.6 6.6a2 2 0 0 1-2.8 0L3.6 13A2 2 0 0 1 3 11.6V3ZM7.5 7.5h.01',
  settings:
    'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.1-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.65 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.56 1.03H21a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15Z',
  close: 'M18 6 6 18M6 6l12 12',
  check: 'M20 6 9 17l-5-5',
  square:
    'M6 3.5h12A2.5 2.5 0 0 1 20.5 6v12a2.5 2.5 0 0 1-2.5 2.5H6A2.5 2.5 0 0 1 3.5 18V6A2.5 2.5 0 0 1 6 3.5Z',
  checkSquare:
    'M20.5 11.3V18a2.5 2.5 0 0 1-2.5 2.5H6A2.5 2.5 0 0 1 3.5 18V6A2.5 2.5 0 0 1 6 3.5h9M8.5 11.5l3.2 3.2L21 5.5',
  repeat:
    'M17 2.5 21.5 7 17 11.5M2.5 12v-1.5A3.5 3.5 0 0 1 6 7h15.5M7 21.5 2.5 17 7 12.5M21.5 12v1.5a3.5 3.5 0 0 1-3.5 3.5H2.5',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7.2V12l3.4 2',
  trash:
    'M3.5 6.5h17M9 6.5V4.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M5.5 6.5 6.4 20a1.5 1.5 0 0 0 1.5 1.4h8.2a1.5 1.5 0 0 0 1.5-1.4l.9-13.5M10 11v6M14 11v6',
  edit: 'M4 20h4l10.5-10.5a2.12 2.12 0 0 0-3-3L5 17v3ZM14.5 6.5l3 3',
  chevronLeft: 'm15 18-6-6 6-6',
  chevronRight: 'm9 18 6-6-6-6',
  chevronDown: 'm6 9 6 6 6-6',
  chevronUp: 'm18 15-6-6-6 6',
  arrowLeft: 'M19 12H5M12 19l-7-7 7-7',
  shuffle: 'M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5',
  sparkles:
    'M12 3 13.7 8.3 19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3ZM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  google:
    'M21.35 11.1H12v3.2h5.35a4.6 4.6 0 0 1-1.99 3.02v2.5h3.22c1.88-1.73 2.96-4.29 2.96-7.33 0-.7-.06-1.37-.19-2.02Z M12 22c2.7 0 4.96-.9 6.61-2.43l-3.22-2.5c-.9.6-2.05.95-3.39.95-2.6 0-4.81-1.76-5.6-4.12H3.07v2.58A10 10 0 0 0 12 22Z M6.4 13.9a6 6 0 0 1 0-3.83V7.49H3.07a10 10 0 0 0 0 8.99l3.33-2.58Z M12 5.98c1.47 0 2.79.5 3.83 1.5l2.85-2.85C16.95 2.98 14.7 2 12 2A10 10 0 0 0 3.07 7.49l3.33 2.58C7.19 7.72 9.4 5.98 12 5.98Z',
  moon: 'M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  monitor: 'M4 4h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1ZM8 20h8M12 16v4',
  filter: 'M3 5h18l-7 8v6l-4 2v-8L3 5Z',
  inbox: 'M3 12h5l2 3h4l2-3h5M4.5 5h15l1.5 7v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6l1.5-7Z',
  restore: 'M3 10a9 9 0 1 1 2 5.7M3 5v5h5',
  alert:
    'M12 8v5M12 16.5h.01M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
  menu: 'M4 6h16M4 12h16M4 18h16',
  eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  eyeOff:
    'M3 3l18 18M10.6 10.6a3 3 0 0 0 4.2 4.2M9.4 5.2A9.6 9.6 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.2 6.6A17 17 0 0 0 2 12s3.6 7 10 7c1.3 0 2.5-.3 3.6-.7',
} as const;

export type IconName = keyof typeof PATHS;

/** Glyphs drawn as solid shapes rather than strokes — brand marks, mostly. */
const FILLED: ReadonlySet<IconName> = new Set<IconName>(['google']);

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
  /** Provide a label to expose the icon to assistive tech; without one it is
   * hidden, which is right whenever adjacent text already says what it means. */
  label?: string;
}

export function Icon({ name, size = 20, label, ...rest }: IconProps) {
  const filled = FILLED.has(name);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label === undefined ? 'presentation' : 'img'}
      aria-hidden={label === undefined ? true : undefined}
      aria-label={label}
      {...rest}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
