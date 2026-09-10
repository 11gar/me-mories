import { addDays } from 'date-fns';
import { z } from 'zod';

import { createId } from '@/lib/id';
import { collapseWhitespace } from '@/lib/text';

import { asTodoId, tagIdSchema, todoIdSchema } from './ids';
import type { TagId, TodoId } from './ids';
import { compareIsoDates, fromIsoDate, isoDateSchema, toIsoDate } from './isoDate';
import type { IsoDate } from './isoDate';
import { advanceOccurrence, recurrenceRuleSchema } from './recurrence';
import type { RecurrenceRule } from './recurrence';

export const TODO_SCHEMA_VERSION = 1;
export const TODO_TITLE_MAX_LENGTH = 280;
export const TODO_MAX_TAGS = 50;

export const todoStatusSchema = z.enum(['todo', 'done', 'postponed']);
export type TodoStatus = z.infer<typeof todoStatusSchema>;

/**
 * A task. One schema covers three natures, told apart by two fields rather than
 * by subtypes — the same additive style the rest of the model uses:
 *
 *  | nature      | `recurrence` | `seriesId` |
 *  | ----------- | ------------ | ---------- |
 *  | one-off     | null         | null       |
 *  | series      | a rule       | null       |
 *  | occurrence  | null         | its series |
 *
 * A **series** is never itself done: `dueDate` always names its *next*
 * occurrence, so it renders as exactly one line wherever that date falls.
 * Completing or postponing it writes an **occurrence** — a frozen record of
 * that day — and moves the series on. The rule is never rewritten by either
 * gesture, which is the whole point of separating the two.
 *
 * `dueDate` is an `IsoDate`, never a `Timestamp`: a deadline is a civil day,
 * and a timestamp shifts by one depending on where it is read. Same reason
 * `DateTag.date` is a string.
 *
 * A deadline is *not* a `DateTag`. A DateTag is a shared entity naming a
 * memorable day ("Voyage au Japon"); a due date is a scalar belonging to one
 * task. Reusing them would fill the Dates page with every deadline ever set.
 */
export const todoSchema = z.object({
  id: todoIdSchema,
  title: z.string().min(1).max(TODO_TITLE_MAX_LENGTH),
  dueDate: isoDateSchema.nullable().default(null),
  recurrence: recurrenceRuleSchema.nullable().default(null),
  status: todoStatusSchema.default('todo'),
  tagIds: z.array(tagIdSchema).max(TODO_MAX_TAGS),
  /** Set on an occurrence, pointing back at the series that produced it. */
  seriesId: todoIdSchema.nullable().default(null),
  postponeCount: z.number().int().min(0).default(0),
  completedAt: z.date().nullable().default(null),
  createdAt: z.date(),
  updatedAt: z.date(),
  /** Soft deletion, as for a Memory: every destructive gesture stays undoable. */
  deletedAt: z.date().nullable().default(null),
  schemaVersion: z.number().int().min(1).default(TODO_SCHEMA_VERSION),
});

export type Todo = z.infer<typeof todoSchema>;

/** What the todo form produces — everything else is derived. */
export interface TodoDraft {
  title: string;
  dueDate: IsoDate | null;
  recurrence: RecurrenceRule | null;
  tagIds: TagId[];
}

/** A partial edit. Absent keys are left untouched. */
export interface TodoPatch {
  title?: string;
  dueDate?: IsoDate | null;
  recurrence?: RecurrenceRule | null;
  tagIds?: TagId[];
}

export const todoDraftSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Le titre ne peut pas être vide.')
      .max(
        TODO_TITLE_MAX_LENGTH,
        `Le titre ne peut pas dépasser ${TODO_TITLE_MAX_LENGTH} caractères.`,
      ),
    dueDate: isoDateSchema.nullable().default(null),
    recurrence: recurrenceRuleSchema.nullable().default(null),
    tagIds: z.array(tagIdSchema).max(TODO_MAX_TAGS).default([]),
  })
  // A repetition needs something to repeat from. Enforced here so the form can
  // say so, rather than at read time where it would make a stored document
  // disappear.
  .refine((draft) => draft.recurrence === null || draft.dueDate !== null, {
    path: ['dueDate'],
    message: 'Une récurrence a besoin d’une date de départ.',
  });

// -------------------------------------------------------------------- natures

/**
 * True for a repeating task.
 *
 * Both fields are required, not just `recurrence`: a rule without an anchor
 * cannot produce dates. A document that somehow carries one degrades to an
 * ordinary todo instead of breaking the page — the same tolerance
 * `resolveTags` applies to dangling ids.
 */
export const isSeries = (todo: Todo): boolean => todo.recurrence !== null && todo.dueDate !== null;

/** True for a record spawned by a series — a completion or a postponement. */
export const isOccurrence = (todo: Todo): boolean => todo.seriesId !== null;

export const isTodoDone = (todo: Todo): boolean => todo.status === 'done';
export const isTodoOpen = (todo: Todo): boolean => todo.status === 'todo';
export const isTodoActive = (todo: Todo): boolean => todo.deletedAt === null;
export const isTodoDeleted = (todo: Todo): boolean => todo.deletedAt !== null;

export const hasTodoTag = (todo: Todo, tagId: TagId): boolean => todo.tagIds.includes(tagId);
export const isTodoUntagged = (todo: Todo): boolean => todo.tagIds.length === 0;

export function isTodoOverdue(todo: Todo, now: Date = new Date()): boolean {
  return todo.status === 'todo' && todo.dueDate !== null && todo.dueDate < toIsoDate(now);
}

export function isTodoDueToday(todo: Todo, now: Date = new Date()): boolean {
  return todo.dueDate !== null && todo.dueDate === toIsoDate(now);
}

/** Whole days a todo has been overdue by; 0 when it is not. */
export function overdueDays(todo: Todo, now: Date = new Date()): number {
  if (todo.dueDate === null) return 0;

  const today = toIsoDate(now);
  if (todo.dueDate >= today) return 0;

  const elapsed = fromIsoDate(today).getTime() - fromIsoDate(todo.dueDate).getTime();
  // Rounded rather than floored: a DST change makes one of these days 23 or 25
  // hours long, which would otherwise be reported as a day short.
  return Math.round(elapsed / 86_400_000);
}

// --------------------------------------------------------------------- writes

export function createTodo(draft: TodoDraft, now: Date = new Date()): Todo {
  return {
    id: asTodoId(createId()),
    title: collapseWhitespace(draft.title),
    dueDate: draft.dueDate,
    // A rule with no anchor is not a series; dropping it keeps the invariant
    // true for every document this app writes.
    recurrence: draft.dueDate === null ? null : draft.recurrence,
    status: 'todo',
    tagIds: [...draft.tagIds],
    seriesId: null,
    postponeCount: 0,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    schemaVersion: TODO_SCHEMA_VERSION,
  };
}

export function applyTodoPatch(todo: Todo, patch: TodoPatch, now: Date = new Date()): Todo {
  const next: Todo = {
    ...todo,
    ...(patch.title === undefined ? {} : { title: collapseWhitespace(patch.title) }),
    ...(patch.dueDate === undefined ? {} : { dueDate: patch.dueDate }),
    ...(patch.recurrence === undefined ? {} : { recurrence: patch.recurrence }),
    ...(patch.tagIds === undefined ? {} : { tagIds: [...patch.tagIds] }),
    updatedAt: now,
  };

  // Editing a series' date re-anchors its rhythm, which is what moving a weekly
  // chore to Thursday means. Clearing the date drops the recurrence with it —
  // there is nothing left to repeat from.
  return next.dueDate === null ? { ...next, recurrence: null } : next;
}

/**
 * The documents a completion or a postponement produces.
 *
 * One shape for both natures: `updated` is written back in place, `created`
 * holds the occurrences a series spawns and is empty for a one-off. The store
 * persists both without needing to know which case it is in.
 */
export interface TodoWriteSet {
  updated: Todo;
  created: Todo[];
}

/**
 * Marks a todo done.
 *
 * A one-off simply flips. A series cannot: it has to stay open for its next
 * occurrence, so the completion is recorded as a separate document frozen at
 * the date that was due — title and tags included, so the record still reads
 * correctly after the series is renamed or deleted — and the series moves on.
 */
export function completeTodo(todo: Todo, now: Date = new Date()): TodoWriteSet {
  if (todo.recurrence === null || todo.dueDate === null) {
    return {
      updated: { ...todo, status: 'done', completedAt: now, updatedAt: now },
      created: [],
    };
  }

  const scheduled = todo.dueDate;

  return {
    updated: {
      ...todo,
      dueDate: advanceOccurrence(scheduled, todo.recurrence, toIsoDate(now)),
      updatedAt: now,
    },
    created: [spawnOccurrence(todo, scheduled, 'done', { completedAt: now, now })],
  };
}

/**
 * Puts a done todo back on the list.
 *
 * An occurrence is not rolled back into its series — that arithmetic breaks as
 * soon as anything was edited in between. It becomes an ordinary live task on
 * its own day instead, keeping `seriesId` as provenance: nothing is lost, and
 * an occurrence whose day has passed simply reappears as overdue.
 */
export function reopenTodo(todo: Todo, now: Date = new Date()): Todo {
  return { ...todo, status: 'todo', completedAt: null, updatedAt: now };
}

/**
 * The day "tomorrow" means for a given todo.
 *
 * Measured from today, not from the due date, so the button does what it says
 * on something a week overdue. A todo already dated in the future keeps moving
 * from its own date, which is the only reading that does not drag it backwards.
 */
export function postponedDueDate(dueDate: IsoDate, now: Date = new Date()): IsoDate {
  const today = toIsoDate(now);
  return toIsoDate(addDays(fromIsoDate(dueDate > today ? dueDate : today), 1));
}

/**
 * Pushes a todo to tomorrow, counting the slip.
 *
 * A one-off moves its own date. A series must not: rewriting its date would
 * quietly redefine the rule for every future occurrence. Instead the day that
 * was due is closed with a `postponed` record, the work itself moves to a
 * detached occurrence tomorrow, and the series carries on untouched.
 *
 * The detached occurrence is skipped when tomorrow is already the series' next
 * date — a daily chore would otherwise show twice tomorrow for the same task.
 */
export function postponeTodo(todo: Todo, now: Date = new Date()): TodoWriteSet {
  if (todo.dueDate === null) return { updated: todo, created: [] };

  if (todo.recurrence === null) {
    return {
      updated: {
        ...todo,
        dueDate: postponedDueDate(todo.dueDate, now),
        postponeCount: todo.postponeCount + 1,
        updatedAt: now,
      },
      created: [],
    };
  }

  const scheduled = todo.dueDate;
  const nextForSeries = advanceOccurrence(scheduled, todo.recurrence, toIsoDate(now));
  const movedTo = postponedDueDate(scheduled, now);

  const created = [spawnOccurrence(todo, scheduled, 'postponed', { postponeCount: 1, now })];

  if (movedTo !== nextForSeries) {
    created.push(spawnOccurrence(todo, movedTo, 'todo', { postponeCount: 1, now }));
  }

  return { updated: { ...todo, dueDate: nextForSeries, updatedAt: now }, created };
}

/** A standalone record of one day of a series, frozen at today's title and tags. */
function spawnOccurrence(
  series: Todo,
  dueDate: IsoDate,
  status: TodoStatus,
  options: { completedAt?: Date; postponeCount?: number; now: Date },
): Todo {
  const { completedAt = null, postponeCount = 0, now } = options;

  return {
    id: asTodoId(createId()),
    title: series.title,
    dueDate,
    recurrence: null,
    status,
    tagIds: [...series.tagIds],
    seriesId: series.id,
    postponeCount,
    completedAt,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    schemaVersion: TODO_SCHEMA_VERSION,
  };
}

export function withTodoTag(todo: Todo, tagId: TagId, now: Date = new Date()): Todo {
  if (hasTodoTag(todo, tagId)) return todo;
  return { ...todo, tagIds: [...todo.tagIds, tagId], updatedAt: now };
}

export function withoutTodoTag(todo: Todo, tagId: TagId, now: Date = new Date()): Todo {
  if (!hasTodoTag(todo, tagId)) return todo;
  return { ...todo, tagIds: todo.tagIds.filter((id) => id !== tagId), updatedAt: now };
}

export const seriesIdOf = (todo: Todo): TodoId | null => todo.seriesId;

// ---------------------------------------------------------------- comparators

/**
 * The order a task list wants: what is still open first, earliest deadline at
 * the top so anything overdue surfaces rather than sinks, undated last, and
 * creation order as the tie-breaker.
 */
export function byTodoUrgency(a: Todo, b: Todo): number {
  if (isTodoOpen(a) !== isTodoOpen(b)) return isTodoOpen(a) ? -1 : 1;

  if (a.dueDate === null || b.dueDate === null) {
    if (a.dueDate !== b.dueDate) return a.dueDate === null ? 1 : -1;
  } else if (a.dueDate !== b.dueDate) {
    return compareIsoDates(a.dueDate, b.dueDate);
  }

  return a.createdAt.getTime() - b.createdAt.getTime();
}
