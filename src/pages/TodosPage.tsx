import { useCallback, useMemo } from 'react';

import type { Todo } from '@/domain/models';
import { organizeTodos } from '@/domain/services/todoOrganization';
import { TodoEditor } from '@/features/todos/components/TodoEditor';
import { TodoSection } from '@/features/todos/components/TodoSection';
import { useTodoActions } from '@/features/todos/hooks/useTodoActions';
import { useLocalStorage } from '@/hooks';
import { useSessionStore, useTagsStore, useTodosStore, useUiStore } from '@/store';
import { Button, EmptyState, Icon, Page, Spinner } from '@/ui';

import styles from './TodosPage.module.scss';

const GROUPS_KEY = 'me-mories:todo-groups';
const HIDE_DONE_KEY = 'me-mories:todo-hide-done';

const SECTIONS = [
  {
    id: 'today' as const,
    title: "Aujourd'hui",
    icon: 'checkSquare' as const,
    description: 'Les tâches du jour, et celles qui auraient dû l’être.',
  },
  { id: 'upcoming' as const, title: 'À venir', icon: 'calendar' as const },
  { id: 'undated' as const, title: 'Sans date', icon: 'inbox' as const },
];

export function TodosPage() {
  const todos = useTodosStore((state) => state.active);
  const loaded = useTodosStore((state) => state.loaded);
  const tags = useTagsStore((state) => state.all);
  const status = useSessionStore((state) => state.status);
  const openTodoCreator = useUiStore((state) => state.openTodoCreator);

  const { edit, toggle, postpone, remove } = useTodoActions();

  // Folded groups and the "hide finished" preference are per-device, not per
  // account: they are about how this screen is being read right now, not about
  // the data. localStorage is the honest home for that.
  const [openGroups, setOpenGroups] = useLocalStorage<Record<string, boolean>>(GROUPS_KEY, {});
  const [hideDone, setHideDone] = useLocalStorage<boolean>(HIDE_DONE_KEY, false);

  // Pinned once per mount, so every row in the list agrees on what "today" and
  // "overdue" mean — recomputing per render could straddle midnight mid-list.
  const now = useMemo(() => new Date(), []);

  const tagOrder = useMemo(() => tags.map((tag) => tag.id), [tags]);

  const sections = useMemo(
    () => organizeTodos(todos, { now, includeCompleted: !hideDone, tagOrder }),
    [todos, now, hideDone, tagOrder],
  );

  const isOpen = useCallback(
    // Groups start unfolded: a task list that opens folded hides the work.
    (groupKey: string) => openGroups[groupKey] ?? true,
    [openGroups],
  );

  const onOpenChange = useCallback(
    (groupKey: string, open: boolean) => {
      setOpenGroups((current) => ({ ...current, [groupKey]: open }));
    },
    [setOpenGroups],
  );

  const total = sections.reduce((count, section) => count + section.remaining, 0);
  const hasAnything = sections.some((section) => section.todos.length > 0);

  if (!loaded && status !== 'ready') {
    return (
      <Page title="À faire">
        <div className={styles.loading}>
          <Spinner size={24} label="Chargement de vos tâches" />
        </div>
      </Page>
    );
  }

  return (
    <Page
      title="À faire"
      description={
        total === 0 ? 'Rien en attente.' : `${total} tâche${total > 1 ? 's' : ''} en attente.`
      }
      actions={
        <Button
          variant="primary"
          onClick={openTodoCreator}
          iconLeft={<Icon name="plus" size={17} />}
        >
          Nouvelle tâche
        </Button>
      }
    >
      {hasAnything ? (
        <>
          <div className={styles.toolbar}>
            <label className={styles.switch}>
              <input
                type="checkbox"
                checked={hideDone}
                onChange={(event) => setHideDone(event.target.checked)}
              />
              Masquer les terminés
            </label>
          </div>

          <div className={styles.sections}>
            {SECTIONS.map((meta) => {
              const section = sections.find((candidate) => candidate.id === meta.id);
              if (section === undefined) return null;

              return (
                <TodoSection
                  key={meta.id}
                  section={section}
                  title={meta.title}
                  icon={meta.icon}
                  description={meta.description}
                  isOpen={isOpen}
                  onOpenChange={onOpenChange}
                  now={now}
                  onToggle={toggle}
                  onPostpone={(todo: Todo) => void postpone(todo.id)}
                  onEdit={(todo: Todo) => edit(todo.id)}
                  onDelete={(todo: Todo) => void remove(todo.id)}
                />
              );
            })}
          </div>
        </>
      ) : (
        <EmptyState
          icon={<Icon name="checkSquare" size={22} />}
          title="Rien à faire"
          description="Ajoutez une tâche, avec ou sans date. Une récurrence la ramènera d’elle-même au bon moment."
          action={
            <Button
              variant="primary"
              onClick={openTodoCreator}
              iconLeft={<Icon name="plus" size={17} />}
            >
              Première tâche
            </Button>
          }
        />
      )}

      <TodoEditor />
    </Page>
  );
}
