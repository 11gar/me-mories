/** Combining diacritical marks, left behind by an NFD decomposition. */
const COMBINING_MARKS = /[̀-ͯ]/g;

/**
 * Collapses a string to a comparable form: lower case, no diacritics, no
 * duplicated whitespace.
 *
 * This is what makes "Café", "cafe" and "CAFÉ" a single tag instead of three.
 * Fast capture means users will never spell a tag the same way twice, so
 * de-duplication has to be insensitive to case and accents.
 */
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/** Trims and collapses whitespace without touching case or accents. */
export function collapseWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function truncate(value: string, maxLength: number, ellipsis = '…'): string {
  if (value.length <= maxLength) return value;
  return value.slice(0, Math.max(0, maxLength - ellipsis.length)).trimEnd() + ellipsis;
}

/** First non-empty line, used as a title-ish preview of a memory. */
export function firstLine(value: string): string {
  const line = value.split('\n').find((candidate) => candidate.trim().length > 0);
  return line?.trim() ?? '';
}
