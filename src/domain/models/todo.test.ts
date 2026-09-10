import { describe, expect, it } from 'vitest';

import { makeTodo } from '@/test/factories';

import { asIsoDate } from './isoDate';
import {
  applyTodoPatch,
  completeTodo,
  createTodo,
  isSeries,
  isTodoOverdue,
  overdueDays,
  postponeTodo,
  postponedDueDate,
  reopenTodo,
  todoDraftSchema,
} from './todo';

const iso = asIsoDate;
const TODAY = new Date(2026, 2, 10, 9, 0);

describe('createTodo', () => {
  it('crée une tâche non terminée', () => {
    const todo = createTodo(
      { title: '  Faire le rapport ', dueDate: null, recurrence: null, tagIds: [] },
      TODAY,
    );

    expect(todo.status).toBe('todo');
    expect(todo.title).toBe('Faire le rapport');
    expect(todo.completedAt).toBeNull();
    expect(todo.postponeCount).toBe(0);
    expect(todo.seriesId).toBeNull();
  });

  it('ignore une récurrence sans date : il n’y a rien pour l’ancrer', () => {
    const todo = createTodo(
      { title: 'Arroser', dueDate: null, recurrence: { unit: 'day', interval: 2 }, tagIds: [] },
      TODAY,
    );

    expect(todo.recurrence).toBeNull();
    expect(isSeries(todo)).toBe(false);
  });
});

describe('todoDraftSchema', () => {
  it('refuse une récurrence sans date de départ', () => {
    const result = todoDraftSchema.safeParse({
      title: 'Arroser',
      dueDate: null,
      recurrence: { unit: 'day', interval: 2 },
      tagIds: [],
    });

    expect(result.success).toBe(false);
  });

  it('accepte une récurrence ancrée sur une date', () => {
    const result = todoDraftSchema.safeParse({
      title: 'Arroser',
      dueDate: '2026-03-10',
      recurrence: { unit: 'day', interval: 2 },
      tagIds: [],
    });

    expect(result.success).toBe(true);
  });
});

describe('completeTodo — tâche ponctuelle', () => {
  it('bascule le statut sans créer d’occurrence', () => {
    const todo = makeTodo({ dueDate: iso('2026-03-10') });
    const { updated, created } = completeTodo(todo, TODAY);

    expect(updated.status).toBe('done');
    expect(updated.completedAt).toEqual(TODAY);
    expect(created).toHaveLength(0);
  });

  it('se dévalide en revenant à faire', () => {
    const done = makeTodo({ status: 'done', completedAt: TODAY });
    const reopened = reopenTodo(done, TODAY);

    expect(reopened.status).toBe('todo');
    expect(reopened.completedAt).toBeNull();
  });
});

describe('completeTodo — série récurrente', () => {
  const series = makeTodo({
    title: 'Sortir les poubelles',
    dueDate: iso('2026-03-10'),
    recurrence: { unit: 'day', interval: 2 },
  });

  it('crée une occurrence validée et avance la série', () => {
    const { updated, created } = completeTodo(series, TODAY);

    expect(updated.status).toBe('todo');
    expect(updated.dueDate).toBe('2026-03-12');
    expect(updated.recurrence).toEqual({ unit: 'day', interval: 2 });

    expect(created).toHaveLength(1);
    expect(created[0]?.status).toBe('done');
    expect(created[0]?.dueDate).toBe('2026-03-10');
    expect(created[0]?.seriesId).toBe(series.id);
    expect(created[0]?.recurrence).toBeNull();
  });

  it('fige le titre et les tags dans l’occurrence', () => {
    // L’occurrence est une trace : elle doit rester lisible après un renommage
    // ou une suppression de la série.
    const tagged = makeTodo({
      title: 'Sortir les poubelles',
      dueDate: iso('2026-03-10'),
      recurrence: { unit: 'week', interval: 1 },
      tagIds: series.tagIds,
    });

    const { created } = completeTodo(tagged, TODAY);

    expect(created[0]?.title).toBe('Sortir les poubelles');
    expect(created[0]?.tagIds).toEqual(tagged.tagIds);
  });

  it('dévalider une occurrence la remet à faire sans toucher la série', () => {
    const { created } = completeTodo(series, TODAY);
    const occurrence = created[0];
    expect(occurrence).toBeDefined();

    const reopened = reopenTodo(occurrence!, TODAY);

    expect(reopened.status).toBe('todo');
    expect(reopened.dueDate).toBe('2026-03-10');
    // La provenance est conservée, mais l’objet est désormais autonome.
    expect(reopened.seriesId).toBe(series.id);
    expect(reopened.recurrence).toBeNull();
  });
});

describe('postponeTodo — tâche ponctuelle', () => {
  it('déplace au lendemain et incrémente le compteur', () => {
    const todo = makeTodo({ dueDate: iso('2026-03-10') });
    const { updated, created } = postponeTodo(todo, TODAY);

    expect(updated.dueDate).toBe('2026-03-11');
    expect(updated.postponeCount).toBe(1);
    expect(updated.status).toBe('todo');
    expect(created).toHaveLength(0);
  });

  it('compte les reports successifs', () => {
    let todo = makeTodo({ dueDate: iso('2026-03-10') });

    todo = postponeTodo(todo, TODAY).updated;
    todo = postponeTodo(todo, new Date(2026, 2, 11)).updated;
    todo = postponeTodo(todo, new Date(2026, 2, 12)).updated;

    expect(todo.postponeCount).toBe(3);
    expect(todo.dueDate).toBe('2026-03-13');
  });

  it('reporte une tâche en retard à demain, pas au lendemain de sa date', () => {
    // Sans cela le bouton « Remettre à demain » ne ferait rien de visible sur
    // une tâche oubliée depuis une semaine.
    const late = makeTodo({ dueDate: iso('2026-03-03') });

    expect(postponeTodo(late, TODAY).updated.dueDate).toBe('2026-03-11');
  });

  it('ne fait rien sur une tâche sans date', () => {
    const undated = makeTodo({ dueDate: null });
    const { updated, created } = postponeTodo(undated, TODAY);

    expect(updated).toEqual(undated);
    expect(created).toHaveLength(0);
  });
});

describe('postponeTodo — série récurrente', () => {
  it('trace le jour prévu, détache le lendemain et laisse la règle intacte', () => {
    const series = makeTodo({
      dueDate: iso('2026-03-10'),
      recurrence: { unit: 'week', interval: 1 },
    });

    const { updated, created } = postponeTodo(series, TODAY);

    expect(updated.recurrence).toEqual({ unit: 'week', interval: 1 });
    expect(updated.dueDate).toBe('2026-03-17');
    expect(updated.postponeCount).toBe(0);

    expect(created).toHaveLength(2);
    expect(created[0]?.status).toBe('postponed');
    expect(created[0]?.dueDate).toBe('2026-03-10');
    expect(created[1]?.status).toBe('todo');
    expect(created[1]?.dueDate).toBe('2026-03-11');
    expect(created[1]?.postponeCount).toBe(1);
  });

  it('n’engendre pas de doublon quand demain est déjà la prochaine occurrence', () => {
    // Série quotidienne : la trace suffit, l’occurrence détachée ferait
    // apparaître deux fois la même tâche demain.
    const daily = makeTodo({
      dueDate: iso('2026-03-10'),
      recurrence: { unit: 'day', interval: 1 },
    });

    const { updated, created } = postponeTodo(daily, TODAY);

    expect(updated.dueDate).toBe('2026-03-11');
    expect(created).toHaveLength(1);
    expect(created[0]?.status).toBe('postponed');
  });

  it('reporter une occupation détachée la traite comme une tâche ordinaire', () => {
    const series = makeTodo({
      dueDate: iso('2026-03-10'),
      recurrence: { unit: 'week', interval: 1 },
    });

    const detached = postponeTodo(series, TODAY).created[1];
    expect(detached).toBeDefined();

    const again = postponeTodo(detached!, new Date(2026, 2, 11));

    expect(again.created).toHaveLength(0);
    expect(again.updated.dueDate).toBe('2026-03-12');
    expect(again.updated.postponeCount).toBe(2);
  });
});

describe('applyTodoPatch', () => {
  it('ré-ancre la récurrence sur la nouvelle date', () => {
    const series = makeTodo({
      dueDate: iso('2026-03-10'),
      recurrence: { unit: 'week', interval: 1 },
    });

    const moved = applyTodoPatch(series, { dueDate: iso('2026-03-12') }, TODAY);

    expect(moved.dueDate).toBe('2026-03-12');
    expect(moved.recurrence).toEqual({ unit: 'week', interval: 1 });
  });

  it('retire la récurrence quand la date est effacée', () => {
    const series = makeTodo({
      dueDate: iso('2026-03-10'),
      recurrence: { unit: 'week', interval: 1 },
    });

    expect(applyTodoPatch(series, { dueDate: null }, TODAY).recurrence).toBeNull();
  });
});

describe('retard', () => {
  it('détecte une date passée sur une tâche encore à faire', () => {
    expect(isTodoOverdue(makeTodo({ dueDate: iso('2026-03-03') }), TODAY)).toBe(true);
    expect(isTodoOverdue(makeTodo({ dueDate: iso('2026-03-10') }), TODAY)).toBe(false);
    expect(isTodoOverdue(makeTodo({ dueDate: iso('2026-03-20') }), TODAY)).toBe(false);
  });

  it('ne considère pas une tâche terminée comme en retard', () => {
    const done = makeTodo({ dueDate: iso('2026-03-03'), status: 'done' });

    expect(isTodoOverdue(done, TODAY)).toBe(false);
  });

  it('compte les jours de retard', () => {
    expect(overdueDays(makeTodo({ dueDate: iso('2026-03-03') }), TODAY)).toBe(7);
    expect(overdueDays(makeTodo({ dueDate: iso('2026-03-10') }), TODAY)).toBe(0);
    expect(overdueDays(makeTodo({ dueDate: null }), TODAY)).toBe(0);
  });
});

describe('postponedDueDate', () => {
  it('vise demain depuis aujourd’hui', () => {
    expect(postponedDueDate(iso('2026-03-10'), TODAY)).toBe('2026-03-11');
  });

  it('décale une date future depuis elle-même', () => {
    expect(postponedDueDate(iso('2026-03-20'), TODAY)).toBe('2026-03-21');
  });
});
