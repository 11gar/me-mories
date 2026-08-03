/**
 * Tag colours.
 *
 * A fixed palette rather than a free colour picker: it keeps the interface
 * coherent, guarantees legible contrast against both themes, and removes a
 * decision from a flow that is supposed to take seconds. A custom colour can
 * still be typed in — `isValidHexColor` is the only gate.
 */

export const TAG_COLORS = [
  '#5b53e8', // violet — the app accent
  '#2f7ded', // bleu
  '#0f9b8e', // sarcelle
  '#3f9142', // vert
  '#9a8a1f', // olive
  '#c9761d', // ambre
  '#d4552f', // orange brûlé
  '#d02f5b', // framboise
  '#a745c4', // orchidée
  '#6b7280', // ardoise
] as const;

export type TagColor = (typeof TAG_COLORS)[number];

export const DEFAULT_TAG_COLOR: TagColor = TAG_COLORS[0];

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

export function isValidHexColor(value: string): boolean {
  return HEX_COLOR_PATTERN.test(value);
}

/**
 * Suggests the least-used colour from the palette, so a user who never picks
 * one still ends up with a visually distinguishable set of tags.
 */
export function suggestTagColor(usedColors: readonly string[]): TagColor {
  const usage = new Map<string, number>(TAG_COLORS.map((color) => [color, 0]));

  for (const color of usedColors) {
    const normalized = color.toLowerCase();
    if (usage.has(normalized)) {
      usage.set(normalized, (usage.get(normalized) ?? 0) + 1);
    }
  }

  let best: TagColor = DEFAULT_TAG_COLOR;
  let lowest = Number.POSITIVE_INFINITY;

  for (const color of TAG_COLORS) {
    const count = usage.get(color) ?? 0;
    if (count < lowest) {
      lowest = count;
      best = color;
    }
  }

  return best;
}

/**
 * Black or white text, whichever is readable on the given background.
 * Uses the WCAG relative-luminance formula rather than a naive average, which
 * gets green badly wrong.
 */
export function readableTextColor(backgroundHex: string): '#ffffff' | '#111111' {
  return relativeLuminance(backgroundHex) > 0.45 ? '#111111' : '#ffffff';
}

export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const [rl, gl, bl] = [r, g, b].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * (rl ?? 0) + 0.7152 * (gl ?? 0) + 0.0722 * (bl ?? 0);
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace('#', '');
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16) || 0,
    g: Number.parseInt(normalized.slice(2, 4), 16) || 0,
    b: Number.parseInt(normalized.slice(4, 6), 16) || 0,
  };
}

/** Same hue at a given alpha — used for soft tag chip backgrounds. */
export function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${r} ${g} ${b} / ${Math.round(alpha * 100)}%)`;
}
