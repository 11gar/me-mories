import {
  differenceInCalendarDays,
  endOfDay,
  format,
  formatDistanceToNowStrict,
  isThisYear,
  isToday,
  isYesterday,
  startOfDay,
} from 'date-fns';
import { fr } from 'date-fns/locale';

/** Whole calendar days between two instants, ignoring the time of day. */
export function daysBetween(from: Date, to: Date): number {
  return differenceInCalendarDays(to, from);
}

export function startOfLocalDay(date: Date): Date {
  return startOfDay(date);
}

export function endOfLocalDay(date: Date): Date {
  return endOfDay(date);
}

/** "il y a 3 jours" — for timestamps close to now. */
export function formatRelative(date: Date): string {
  if (isToday(date)) return "aujourd'hui";
  if (isYesterday(date)) return 'hier';
  return `il y a ${formatDistanceToNowStrict(date, { locale: fr })}`;
}

/** "12 mars 2024" — drops the year for the current one. */
export function formatLongDate(date: Date): string {
  return format(date, isThisYear(date) ? 'd MMMM' : 'd MMMM yyyy', { locale: fr });
}

/** "12 mars 2024 à 14:05" */
export function formatDateTime(date: Date): string {
  return format(date, "d MMMM yyyy 'à' HH:mm", { locale: fr });
}

/** "mars 2024" — calendar headers. */
export function formatMonthYear(date: Date): string {
  return format(date, 'MMMM yyyy', { locale: fr });
}

export function formatWeekday(date: Date): string {
  return format(date, 'EEEE', { locale: fr });
}

/** Machine-readable value for <time datetime="…">. */
export function toDateTimeAttribute(date: Date): string {
  return date.toISOString();
}
