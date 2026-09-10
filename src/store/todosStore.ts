import { create } from 'zustand';

import type { TagId, Todo, TodoDraft, TodoId, TodoPatch } from '@/domain/models';
import {
  applyTodoPatch,
  byTodoUrgency,
  completeTodo,
  createTodo as buildTodo,
  isTodoActive,
  isTodoDeleted,
  postponeTodo as buildPostponement,
  reopenTodo,
} from '@/domain/models';
import type { CollectionChange } from '@/domain/repositories';
import { todoRepository } from '@/infrastructure/firebase';

import { requireUserId } from './sessionStore';

interface TodosState {
  byId: Record<string, Todo>;
  /**
   * Derived lists, recomputed whenever a snapshot lands — same reasoning as the
   * memories store: a selector that rebuilt an array on every call would
   * re-render every subscriber on every unrelated change.
   */
  all: Todo[];
  active: Todo[];
  trashed: Todo[];
  loaded: boolean;

  applyChanges: (changes: CollectionChange<Todo>[]) => void;
  reset: () => void;
}

function derive(byId: Record<string, Todo>) {
  const all = Object.values(byId).sort(byTodoUrgency);

  return {
    byId,
    all,
    active: all.filter(isTodoActive),
    trashed: all.filter(isTodoDeleted),
  };
}

export const useTodosStore = create<TodosState>()((set) => ({
  byId: {},
  all: [],
  active: [],
  trashed: [],
  loaded: false,

  applyChanges: (changes) =>
    set((state) => {
      if (changes.length === 0) return { loaded: true };

      const byId = { ...state.byId };

      for (const change of changes) {
        if (change.type === 'removed') {
          delete byId[change.id];
        } else {
          byId[change.entity.id] = change.entity;
        }
      }

      return { ...derive(byId), loaded: true };
    }),

  reset: () => set({ byId: {}, all: [], active: [], trashed: [], loaded: false }),
}));

export const selectTodoById = (todoId: TodoId | undefined) => (state: TodosState) =>
  todoId === undefined ? undefined : state.byId[todoId];

// ---------------------------------------------------------------------------
// Actions
//
// As everywhere else in this app, there is no hand-written optimistic update:
// the write goes to Firestore, whose latency compensation applies it to the
// local cache immediately and emits a snapshot, so the store is already current
// before the network answers — and an offline tick replays on its own.
// ---------------------------------------------------------------------------

export async function createTodo(draft: TodoDraft, now = new Date()): Promise<Todo> {
  const todo = buildTodo(draft, now);
  await todoRepository.create(requireUserId(), todo);
  return todo;
}

export async function updateTodo(
  todoId: TodoId,
  patch: TodoPatch,
  now = new Date(),
): Promise<void> {
  const todo = useTodosStore.getState().byId[todoId];
  if (todo === undefined) return;

  await todoRepository.update(requireUserId(), applyTodoPatch(todo, patch, now));
}

/**
 * Ticks or unticks a todo.
 *
 * The interesting half is a recurring series, which cannot simply flip: the
 * domain turns the tick into "record this occurrence, advance the series", and
 * both documents are written together.
 *
 * Returns the document as written, so a caller that needs to say what happened
 * — "next one on the 17th" — reads it from the domain rather than racing the
 * snapshot back through the store.
 */
export async function setTodoDone(
  todoId: TodoId,
  done: boolean,
  now = new Date(),
): Promise<Todo | undefined> {
  const todo = useTodosStore.getState().byId[todoId];
  if (todo === undefined) return undefined;

  if (!done) {
    const reopened = reopenTodo(todo, now);
    await todoRepository.update(requireUserId(), reopened);
    return reopened;
  }

  const { updated, created } = completeTodo(todo, now);
  await todoRepository.saveWriteSet(requireUserId(), updated, created);
  return updated;
}

/**
 * Moves a todo to tomorrow and counts the slip.
 *
 * For a series this writes the day that was due as a `postponed` record, moves
 * the work to a detached occurrence, and leaves the recurrence rule alone — see
 * `postponeTodo` in the domain for why that separation matters.
 */
export async function postponeTodoToTomorrow(todoId: TodoId, now = new Date()): Promise<void> {
  const todo = useTodosStore.getState().byId[todoId];
  if (todo === undefined || todo.dueDate === null) return;

  const { updated, created } = buildPostponement(todo, now);
  await todoRepository.saveWriteSet(requireUserId(), updated, created);
}

export async function softDeleteTodo(todoId: TodoId, now = new Date()): Promise<void> {
  await todoRepository.softDelete(requireUserId(), todoId, now);
}

export async function restoreTodo(todoId: TodoId, now = new Date()): Promise<void> {
  await todoRepository.restore(requireUserId(), todoId, now);
}

export async function hardDeleteTodo(todoId: TodoId): Promise<void> {
  await todoRepository.hardDelete(requireUserId(), todoId);
}

export async function emptyTodoTrash(): Promise<void> {
  const userId = requireUserId();
  const { trashed } = useTodosStore.getState();

  await Promise.all(trashed.map((todo) => todoRepository.hardDelete(userId, todo.id)));
}

/** Todos carrying a given tag — the input to the delete and merge cascades. */
export function todoIdsWithTag(tagId: TagId): TodoId[] {
  return useTodosStore
    .getState()
    .all.filter((todo) => todo.tagIds.includes(tagId))
    .map((todo) => todo.id);
}
