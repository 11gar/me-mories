import { useCallback } from 'react';

import { useToast } from '@/app/providers/toastContext';
import { toAppError } from '@/domain/errors';
import type { Todo, TodoId } from '@/domain/models';
import { fromIsoDate, isSeries } from '@/domain/models';
import { formatLongDate } from '@/lib/date';
import {
  postponeTodoToTomorrow,
  restoreTodo,
  setTodoDone,
  softDeleteTodo,
  useUiStore,
} from '@/store';

/**
 * Todo mutations with the interaction that has to go with them.
 *
 * Ticking a one-off is silent — the checkbox itself is the feedback, and a
 * toast for every item would make working through a list unbearable. A series
 * does get one, because the useful information is invisible otherwise: the
 * line vanished from today and reappears on a date the user has not seen yet.
 */
export function useTodoActions() {
  const { showToast } = useToast();
  const openTodoEditor = useUiStore((state) => state.openTodoEditor);

  const edit = useCallback(
    (todoId: TodoId) => {
      openTodoEditor(todoId);
    },
    [openTodoEditor],
  );

  const setDone = useCallback(
    async (todoId: TodoId, done: boolean) => {
      try {
        const written = await setTodoDone(todoId, done);

        // Only a series has something to announce, and the date comes from the
        // document just written rather than from a re-read of the store, which
        // would race the snapshot coming back.
        if (!done || written === undefined || !isSeries(written) || written.dueDate === null) {
          return;
        }

        showToast(
          `Fait. Prochaine occurrence le ${formatLongDate(fromIsoDate(written.dueDate))}.`,
          {
            tone: 'success',
          },
        );
      } catch (error) {
        showToast(toAppError(error).message, { tone: 'danger' });
      }
    },
    [showToast],
  );

  /**
   * No undo here, deliberately. Postponing a series writes two or three
   * documents, and an "undo" that had to unpick them would be a second, more
   * fragile write path for a gesture whose whole point is to be cheap. The date
   * is editable from the form if it was a mistake.
   */
  const postpone = useCallback(
    async (todoId: TodoId) => {
      try {
        await postponeTodoToTomorrow(todoId);
        showToast('Reporté à demain.');
      } catch (error) {
        showToast(toAppError(error).message, { tone: 'danger' });
      }
    },
    [showToast],
  );

  const remove = useCallback(
    async (todoId: TodoId) => {
      try {
        await softDeleteTodo(todoId);

        showToast('Tâche supprimée.', {
          action: {
            label: 'Annuler',
            onClick: () => {
              void restoreTodo(todoId).catch((error: unknown) => {
                showToast(toAppError(error).message, { tone: 'danger' });
              });
            },
          },
          duration: 8_000,
        });
      } catch (error) {
        showToast(toAppError(error).message, { tone: 'danger' });
      }
    },
    [showToast],
  );

  const toggle = useCallback(
    (todo: Todo) => {
      void setDone(todo.id, todo.status !== 'done');
    },
    [setDone],
  );

  return { edit, setDone, toggle, postpone, remove };
}
