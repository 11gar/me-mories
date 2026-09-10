import type { TagId } from '../models/ids';
import { toIsoDate } from '../models/isoDate';
import { byTodoUrgency, isTodoActive, isTodoOpen } from '../models/todo';
import type { Todo } from '../models/todo';

/**
 * The shape of the Todo page, computed as a pure function.
 *
 * All of it lives in the domain rather than in the page for the same reason the
 * rest of the read model does: sectioning, overdue handling and tag grouping
 * are the rules of the feature, and rules that live inside a component can only
 * be verified by rendering one.
 */

export type TodoSectionId = 'today' | 'upcoming' | 'undated';

export interface TodoTagGroup {
  /** `null` is the "Sans tag" group, always rendered last. */
  tagId: TagId | null;
  todos: Todo[];
  /** Items still to do — what the accordion header counts. */
  remaining: number;
}

export interface TodoSection {
  id: TodoSectionId;
  /** Distinct todos in the section; the tag groups below may repeat one. */
  todos: Todo[];
  groups: TodoTagGroup[];
  remaining: number;
}

export interface OrganizeTodosOptions {
  now?: Date;
  /** Whether today's finished and postponed items stay on screen. */
  includeCompleted?: boolean;
  /** Orders the tag groups — pass the store's alphabetical tag list. */
  tagOrder?: readonly TagId[];
}

const SECTION_ORDER: readonly TodoSectionId[] = ['today', 'upcoming', 'undated'];

/**
 * Splits todos into the three sections, each grouped by tag.
 *
 * Two decisions are worth stating, because neither is in the wording of the
 * feature and both change what people see:
 *
 * **Overdue items belong to today.** A task due last Tuesday is still work for
 * now, so it sits at the top of "Aujourd'hui" rather than in a fourth section
 * nobody opens. Burying late work is how a task list quietly stops being used.
 *
 * **A todo appears under every tag it carries.** A tag group is a lens, not a
 * folder — exactly how tag filters already behave for memories. The visible
 * cost is that group counts add up to more than the section count; the
 * alternative, picking one "main" tag, would hide a task from the very group
 * someone is looking in.
 */
export function organizeTodos(
  todos: readonly Todo[],
  options: OrganizeTodosOptions = {},
): TodoSection[] {
  const { now = new Date(), includeCompleted = true, tagOrder = [] } = options;
  const today = toIsoDate(now);

  const bySection = new Map<TodoSectionId, Todo[]>(SECTION_ORDER.map((id) => [id, []]));

  for (const todo of todos) {
    if (!isVisible(todo, today, includeCompleted)) continue;
    bySection.get(sectionOf(todo, today))?.push(todo);
  }

  return SECTION_ORDER.map((id) => {
    const sectionTodos = (bySection.get(id) ?? []).sort(byTodoUrgency);

    return {
      id,
      todos: sectionTodos,
      groups: groupByTag(sectionTodos, tagOrder),
      remaining: sectionTodos.filter(isTodoOpen).length,
    };
  });
}

/**
 * Whether a todo still belongs on the list.
 *
 * Open todos always do. Finished and postponed ones only survive for the day
 * they were due — long enough to see the tick land and to take it back, not so
 * long that the list turns into an archive. The postponement records a series
 * leaves behind disappear the same way, which is what keeps them from piling up
 * in view.
 */
function isVisible(todo: Todo, today: string, includeCompleted: boolean): boolean {
  if (!isTodoActive(todo)) return false;
  if (isTodoOpen(todo)) return true;
  if (!includeCompleted) return false;

  if (todo.dueDate !== null) return todo.dueDate === today;
  return todo.completedAt !== null && toIsoDate(todo.completedAt) === today;
}

function sectionOf(todo: Todo, today: string): TodoSectionId {
  if (todo.dueDate === null) return 'undated';
  return todo.dueDate <= today ? 'today' : 'upcoming';
}

function groupByTag(todos: readonly Todo[], tagOrder: readonly TagId[]): TodoTagGroup[] {
  const tagged = new Map<TagId, Todo[]>();
  const untagged: Todo[] = [];

  for (const todo of todos) {
    if (todo.tagIds.length === 0) {
      untagged.push(todo);
      continue;
    }

    for (const tagId of todo.tagIds) {
      const bucket = tagged.get(tagId);
      if (bucket === undefined) tagged.set(tagId, [todo]);
      else bucket.push(todo);
    }
  }

  // Follow the caller's tag order — alphabetical, in practice — so groups do
  // not jump around as todos are ticked off. A tag missing from it (deleted, or
  // not yet synced) falls to the end rather than disappearing.
  const rank = new Map(tagOrder.map((tagId, index) => [tagId, index]));
  const groups: TodoTagGroup[] = [...tagged.entries()]
    .sort(
      ([a], [b]) =>
        (rank.get(a) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b) ?? Number.MAX_SAFE_INTEGER),
    )
    .map(([tagId, group]) => ({ tagId, todos: group, remaining: group.filter(isTodoOpen).length }));

  if (untagged.length > 0) {
    groups.push({ tagId: null, todos: untagged, remaining: untagged.filter(isTodoOpen).length });
  }

  return groups;
}

/** Open todos due today or earlier — the number the nav badge would show. */
export function countTodosDueNow(todos: readonly Todo[], now: Date = new Date()): number {
  const today = toIsoDate(now);

  return todos.filter(
    (todo) =>
      isTodoActive(todo) && isTodoOpen(todo) && todo.dueDate !== null && todo.dueDate <= today,
  ).length;
}

/** Todo counts per tag, mirroring `countByTag` for memories. */
export function countTodosByTag(todos: readonly Todo[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const todo of todos) {
    if (!isTodoActive(todo) || !isTodoOpen(todo)) continue;
    for (const tagId of todo.tagIds) {
      counts.set(tagId, (counts.get(tagId) ?? 0) + 1);
    }
  }

  return counts;
}
