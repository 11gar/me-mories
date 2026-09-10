import { addDays, addMonths, addWeeks } from 'date-fns';
import { z } from 'zod';

import { fromIsoDate, toIsoDate } from './isoDate';
import type { IsoDate } from './isoDate';

/**
 * A repetition rule, as a unit and a multiplier: "every 2 days", "every week".
 *
 * Deliberately not RFC 5545 (RRULE). A full RRULE parser is ~40 kB for three
 * cases nobody has asked for, and its string form is unreadable in the
 * Firestore console. Two fields cover every periodicity the app offers today,
 * and the shape is additive: a `byWeekday` for "every Monday and Thursday"
 * slots in later as an optional field, with no migration — the same escape
 * hatch the rest of the model relies on.
 */

export const RECURRENCE_MAX_INTERVAL = 365;

export const recurrenceUnitSchema = z.enum(['day', 'week', 'month']);
export type RecurrenceUnit = z.infer<typeof recurrenceUnitSchema>;

export const recurrenceRuleSchema = z.object({
  unit: recurrenceUnitSchema,
  interval: z.number().int().min(1).max(RECURRENCE_MAX_INTERVAL),
});

export type RecurrenceRule = z.infer<typeof recurrenceRuleSchema>;

/**
 * The occurrence that follows `date`, one interval later.
 *
 * Month arithmetic clamps rather than overflows: 31 January plus one month is
 * 28 (or 29) February, not 3 March. `date-fns` already does this, and it is the
 * behaviour a monthly chore expects — "the last day of the month" should not
 * drift into the next one.
 */
export function nextOccurrence(date: IsoDate, rule: RecurrenceRule): IsoDate {
  const from = fromIsoDate(date);

  switch (rule.unit) {
    case 'day':
      return toIsoDate(addDays(from, rule.interval));
    case 'week':
      return toIsoDate(addWeeks(from, rule.interval));
    case 'month':
      return toIsoDate(addMonths(from, rule.interval));
  }
}

/**
 * Iterations before `advanceOccurrence` gives up. An interval of one day needs
 * one step per missed day, so this covers roughly three years of neglect —
 * well past the point where rolling forward is still the useful answer.
 */
const MAX_ADVANCE_STEPS = 1_200;

/**
 * The first occurrence strictly after `notBefore`, stepping from `date`.
 *
 * Stepping — rather than jumping straight to today — is what keeps the rhythm
 * intact when a series has been neglected. A chore due every two days and left
 * for five lands back on its own parity, not on an arbitrary new anchor.
 *
 * The loop is bounded: a series abandoned for years must not freeze the UI.
 * Past the bound it returns the last date computed, which is still in the past
 * and therefore still visibly overdue — a wrong-but-honest result beats a hang.
 */
export function advanceOccurrence(
  date: IsoDate,
  rule: RecurrenceRule,
  notBefore: IsoDate,
): IsoDate {
  let candidate = nextOccurrence(date, rule);

  for (let step = 0; candidate <= notBefore && step < MAX_ADVANCE_STEPS; step += 1) {
    candidate = nextOccurrence(candidate, rule);
  }

  return candidate;
}

const UNIT_LABELS: Record<RecurrenceUnit, { singular: string; plural: string }> = {
  day: { singular: 'tous les jours', plural: 'jours' },
  week: { singular: 'toutes les semaines', plural: 'semaines' },
  month: { singular: 'tous les mois', plural: 'mois' },
};

/** "tous les 2 jours", "toutes les semaines" — for chips and summaries. */
export function describeRecurrence(rule: RecurrenceRule): string {
  const labels = UNIT_LABELS[rule.unit];
  if (rule.interval === 1) return labels.singular;

  const article = rule.unit === 'week' ? 'toutes les' : 'tous les';
  return `${article} ${rule.interval} ${labels.plural}`;
}

/**
 * The periodicities offered in the form.
 *
 * A short list of what people actually pick, rather than a unit selector plus a
 * number input: choosing a recurrence should cost one tap. Any other rule
 * remains representable in the model, so widening this list is a one-line
 * change here.
 */
export const RECURRENCE_PRESETS: ReadonlyArray<{ label: string; rule: RecurrenceRule }> = [
  { label: 'Tous les jours', rule: { unit: 'day', interval: 1 } },
  { label: 'Tous les 2 jours', rule: { unit: 'day', interval: 2 } },
  { label: 'Toutes les semaines', rule: { unit: 'week', interval: 1 } },
  { label: 'Toutes les 2 semaines', rule: { unit: 'week', interval: 2 } },
  { label: 'Tous les mois', rule: { unit: 'month', interval: 1 } },
  { label: 'Tous les 3 mois', rule: { unit: 'month', interval: 3 } },
];

export function isSameRecurrence(a: RecurrenceRule | null, b: RecurrenceRule | null): boolean {
  if (a === null || b === null) return a === b;
  return a.unit === b.unit && a.interval === b.interval;
}
