import { z } from 'zod';

/**
 * A civil date — "12 March 2024" — as `YYYY-MM-DD`.
 *
 * Deliberately not a `Date` or a `Timestamp`. A DateTag names a day, not an
 * instant: stored as a timestamp it shifts by a day depending on the reader's
 * timezone, which is a silent, maddening bug in an app whose whole promise is
 * finding a dated memory again. A string can't drift.
 */
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const isoDateSchema = z
  .string()
  .regex(ISO_DATE_PATTERN, 'La date doit être au format AAAA-MM-JJ.')
  .refine(isRealCalendarDate, 'Cette date n’existe pas.')
  .brand<'IsoDate'>();

export type IsoDate = z.infer<typeof isoDateSchema>;

/** Unchecked cast for values already known to be well-formed. */
export const asIsoDate = (value: string): IsoDate => value as IsoDate;

/**
 * Rejects well-formed but impossible dates such as 2024-02-31, which `new Date`
 * would happily roll over to 2 March.
 */
function isRealCalendarDate(value: string): boolean {
  const [year, month, day] = value.split('-').map(Number);
  if (year === undefined || month === undefined || day === undefined) return false;
  if (month < 1 || month > 12 || day < 1) return false;

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day <= daysInMonth;
}

export function isIsoDate(value: string): value is IsoDate {
  return ISO_DATE_PATTERN.test(value) && isRealCalendarDate(value);
}

/** Local calendar day of an instant, as an IsoDate. */
export function toIsoDate(date: Date): IsoDate {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return asIsoDate(`${year}-${month}-${day}`);
}

/** Local midnight of an IsoDate. Never parse an IsoDate with `new Date(string)`
 * — that reads it as UTC and can land on the previous day. */
export function fromIsoDate(value: IsoDate): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

export function todayIso(now: Date = new Date()): IsoDate {
  return toIsoDate(now);
}

/** Chronological comparator, usable directly in `Array.prototype.sort`. */
export function compareIsoDates(a: IsoDate, b: IsoDate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
