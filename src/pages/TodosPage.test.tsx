import { render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/app/providers/ToastProvider';
import type { Tag, Todo } from '@/domain/models';
import { asIsoDate, asTagId } from '@/domain/models';
import { makeTag, makeTodo } from '@/test/factories';
import { useSessionStore, useTagsStore, useTodosStore } from '@/store';

import { TodosPage } from './TodosPage';

/**
 * The Firebase adapters are stubbed out wholesale.
 *
 * Importing `@/store` reaches `infrastructure/firebase/client`, which validates
 * the environment at module load and throws when it is unset — as it is under
 * test, on purpose. Nothing here needs a backend anyway: the stores are seeded
 * directly, and no assertion goes through a write path.
 */
vi.mock('@/infrastructure/firebase', () => {
  const repository = {
    observeAll: () => () => undefined,
    create: async () => undefined,
    update: async () => undefined,
    saveWriteSet: async () => undefined,
    softDelete: async () => undefined,
    restore: async () => undefined,
    hardDelete: async () => undefined,
    createMany: async () => undefined,
    markReviewed: async () => undefined,
    detachTag: async () => undefined,
    detachDateTag: async () => undefined,
    replaceTag: async () => undefined,
    delete: async () => undefined,
  };

  return {
    authGateway: { observeUser: () => () => undefined },
    userProfileRepository: {},
    memoryRepository: repository,
    tagRepository: repository,
    dateTagRepository: repository,
    todoRepository: repository,
    mapFirebaseError: (error: unknown) => error,
  };
});

/**
 * A smoke test for the page's wiring.
 *
 * The sectioning and grouping rules themselves are covered exhaustively in
 * `todoOrganization.test.ts`, where they are pure functions. What is verified
 * here is the part that only a render can prove: that the store feeds the
 * organiser, that groups end up inside their accordion headed by the right
 * tag, and that the empty state is reachable.
 */

const TODAY = new Date(2026, 2, 10, 9, 0);

function seed(todos: readonly Todo[], tags: readonly Tag[] = []): void {
  useTodosStore.getState().reset();
  useTagsStore.getState().reset();

  useTagsStore
    .getState()
    .applyChanges(tags.map((tag) => ({ type: 'upserted' as const, entity: tag })));
  useTodosStore
    .getState()
    .applyChanges(todos.map((todo) => ({ type: 'upserted' as const, entity: todo })));

  useSessionStore.getState().setStatus('ready');
}

function renderPage() {
  return render(
    <ToastProvider>
      <TodosPage />
    </ToastProvider>,
  );
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(TODAY);
  window.localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
  useTodosStore.getState().reset();
  useTagsStore.getState().reset();
});

describe('TodosPage', () => {
  it('invite à créer une première tâche quand la liste est vide', () => {
    seed([]);
    renderPage();

    expect(screen.getByText('Rien à faire')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Première tâche' })).toBeInTheDocument();
  });

  it('affiche les trois sections dans l’ordre attendu', () => {
    seed([
      makeTodo({ title: 'Du jour', dueDate: asIsoDate('2026-03-10') }),
      makeTodo({ title: 'Plus tard', dueDate: asIsoDate('2026-03-20') }),
      makeTodo({ title: 'Un jour', dueDate: null }),
    ]);
    renderPage();

    const headings = screen.getAllByRole('heading', { level: 2 }).map((node) => node.textContent);

    expect(headings[0]).toContain("Aujourd'hui");
    expect(headings[1]).toContain('À venir');
    expect(headings[2]).toContain('Sans date');
  });

  it('regroupe les tâches sous un accordéon par tag', () => {
    const work = makeTag({ id: asTagId('tag-work'), title: 'Travail', titleNormalized: 'travail' });
    const home = makeTag({ id: asTagId('tag-home'), title: 'Perso', titleNormalized: 'perso' });

    seed(
      [
        makeTodo({
          title: 'Faire le rapport',
          dueDate: asIsoDate('2026-03-10'),
          tagIds: [work.id],
        }),
        makeTodo({
          title: 'Faire les courses',
          dueDate: asIsoDate('2026-03-10'),
          tagIds: [home.id],
        }),
        makeTodo({ title: 'Sans étiquette', dueDate: asIsoDate('2026-03-10') }),
      ],
      [work, home],
    );
    renderPage();

    const groups = screen.getAllByRole('group');

    // Alphabétique, insensible aux accents — l’ordre du store des tags — puis
    // « Sans tag » en dernier.
    expect(within(groups[0]!).getByText('Perso')).toBeInTheDocument();
    expect(within(groups[0]!).getByText('Faire les courses')).toBeInTheDocument();
    expect(within(groups[1]!).getByText('Travail')).toBeInTheDocument();
    expect(within(groups[2]!).getByText('Sans tag')).toBeInTheDocument();
  });

  it('signale une tâche en retard dans la section du jour', () => {
    seed([makeTodo({ title: 'Oubliée', dueDate: asIsoDate('2026-03-03') })]);
    renderPage();

    expect(screen.getByText('en retard de 7 j')).toBeInTheDocument();
  });

  it('coche une tâche terminée et la barre visuellement', () => {
    seed([
      makeTodo({
        title: 'Déjà fait',
        dueDate: asIsoDate('2026-03-10'),
        status: 'done',
        completedAt: TODAY,
      }),
    ]);
    renderPage();

    expect(screen.getByRole('checkbox', { name: 'Rouvrir : Déjà fait' })).toBeChecked();
  });

  it('n’offre pas de report sur une tâche sans date', () => {
    seed([makeTodo({ title: 'Un jour', dueDate: null })]);
    renderPage();

    expect(
      screen.queryByRole('button', { name: 'Remettre à demain : Un jour' }),
    ).not.toBeInTheDocument();
  });

  it('offre un report sur une tâche datée', () => {
    seed([makeTodo({ title: 'Courses', dueDate: asIsoDate('2026-03-10') })]);
    renderPage();

    expect(screen.getByRole('button', { name: 'Remettre à demain : Courses' })).toBeInTheDocument();
  });

  it('affiche la périodicité d’une tâche récurrente', () => {
    seed([
      makeTodo({
        title: 'Poubelles',
        dueDate: asIsoDate('2026-03-10'),
        recurrence: { unit: 'day', interval: 2 },
      }),
    ]);
    renderPage();

    expect(screen.getByText('tous les 2 jours')).toBeInTheDocument();
  });
});
