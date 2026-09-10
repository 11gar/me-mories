import { describe, expect, it } from 'vitest';

import { asIsoDate, asTagId } from '@/domain/models';
import { makeTodo } from '@/test/factories';

import { countTodosDueNow, organizeTodos } from './todoOrganization';
import type { TodoSection, TodoSectionId } from './todoOrganization';

const iso = asIsoDate;
const TODAY = new Date(2026, 2, 10, 9, 0);

const WORK = asTagId('tag-work');
const HOME = asTagId('tag-home');

const sectionOf = (sections: TodoSection[], id: TodoSectionId): TodoSection => {
  const section = sections.find((candidate) => candidate.id === id);
  if (section === undefined) throw new Error(`Section ${id} absente.`);
  return section;
};

const titlesIn = (sections: TodoSection[], id: TodoSectionId): string[] =>
  sectionOf(sections, id).todos.map((todo) => todo.title);

describe('organizeTodos — sections', () => {
  it('répartit en aujourd’hui, à venir et sans date', () => {
    const sections = organizeTodos(
      [
        makeTodo({ title: 'Aujourd’hui', dueDate: iso('2026-03-10') }),
        makeTodo({ title: 'Demain', dueDate: iso('2026-03-11') }),
        makeTodo({ title: 'Un jour', dueDate: null }),
      ],
      { now: TODAY },
    );

    expect(titlesIn(sections, 'today')).toEqual(['Aujourd’hui']);
    expect(titlesIn(sections, 'upcoming')).toEqual(['Demain']);
    expect(titlesIn(sections, 'undated')).toEqual(['Un jour']);
  });

  it('range les tâches en retard dans « aujourd’hui », en tête', () => {
    // Le choix est délibéré : une tâche en retard reste du travail pour
    // maintenant, pas une quatrième section qu’on n’ouvre jamais.
    const sections = organizeTodos(
      [
        makeTodo({ title: 'Du jour', dueDate: iso('2026-03-10') }),
        makeTodo({ title: 'En retard', dueDate: iso('2026-03-04') }),
      ],
      { now: TODAY },
    );

    expect(titlesIn(sections, 'today')).toEqual(['En retard', 'Du jour']);
  });

  it('trie les tâches à venir chronologiquement', () => {
    const sections = organizeTodos(
      [
        makeTodo({ title: 'Dans un mois', dueDate: iso('2026-04-10') }),
        makeTodo({ title: 'Après-demain', dueDate: iso('2026-03-12') }),
        makeTodo({ title: 'Demain', dueDate: iso('2026-03-11') }),
      ],
      { now: TODAY },
    );

    expect(titlesIn(sections, 'upcoming')).toEqual(['Demain', 'Après-demain', 'Dans un mois']);
  });

  it('exclut les tâches supprimées', () => {
    const sections = organizeTodos(
      [makeTodo({ title: 'Corbeille', dueDate: iso('2026-03-10'), deletedAt: TODAY })],
      { now: TODAY },
    );

    expect(sectionOf(sections, 'today').todos).toHaveLength(0);
  });
});

describe('organizeTodos — tâches terminées', () => {
  it('garde une tâche du jour terminée dans sa section', () => {
    const sections = organizeTodos(
      [makeTodo({ title: 'Fait', dueDate: iso('2026-03-10'), status: 'done', completedAt: TODAY })],
      { now: TODAY },
    );

    expect(titlesIn(sections, 'today')).toEqual(['Fait']);
    expect(sectionOf(sections, 'today').remaining).toBe(0);
  });

  it('place les terminées après ce qu’il reste à faire', () => {
    const sections = organizeTodos(
      [
        makeTodo({ title: 'Fait', dueDate: iso('2026-03-10'), status: 'done', completedAt: TODAY }),
        makeTodo({ title: 'À faire', dueDate: iso('2026-03-10') }),
      ],
      { now: TODAY },
    );

    expect(titlesIn(sections, 'today')).toEqual(['À faire', 'Fait']);
  });

  it('n’affiche plus une tâche terminée d’un jour passé', () => {
    // Passé aujourd’hui, une occurrence validée est de l’historique : la garder
    // transformerait la liste en archive.
    const sections = organizeTodos(
      [
        makeTodo({
          title: 'Fait hier',
          dueDate: iso('2026-03-09'),
          status: 'done',
          completedAt: new Date(2026, 2, 9),
        }),
      ],
      { now: TODAY },
    );

    expect(sectionOf(sections, 'today').todos).toHaveLength(0);
  });

  it('masque les terminées sur demande', () => {
    const sections = organizeTodos(
      [
        makeTodo({ title: 'Fait', dueDate: iso('2026-03-10'), status: 'done', completedAt: TODAY }),
        makeTodo({ title: 'À faire', dueDate: iso('2026-03-10') }),
      ],
      { now: TODAY, includeCompleted: false },
    );

    expect(titlesIn(sections, 'today')).toEqual(['À faire']);
  });

  it('garde la trace « reporté » du jour, puis la laisse disparaître', () => {
    const trace = { title: 'Reporté', status: 'postponed' as const };

    const today = organizeTodos([makeTodo({ ...trace, dueDate: iso('2026-03-10') })], {
      now: TODAY,
    });
    const yesterday = organizeTodos([makeTodo({ ...trace, dueDate: iso('2026-03-09') })], {
      now: TODAY,
    });

    expect(titlesIn(today, 'today')).toEqual(['Reporté']);
    expect(sectionOf(yesterday, 'today').todos).toHaveLength(0);
  });
});

describe('organizeTodos — groupes par tag', () => {
  it('fait apparaître une tâche dans chacun de ses tags', () => {
    const sections = organizeTodos(
      [makeTodo({ title: 'Partagée', dueDate: iso('2026-03-10'), tagIds: [WORK, HOME] })],
      { now: TODAY, tagOrder: [HOME, WORK] },
    );

    const { groups, todos } = sectionOf(sections, 'today');

    expect(groups.map((group) => group.tagId)).toEqual([HOME, WORK]);
    expect(groups.every((group) => group.todos.length === 1)).toBe(true);
    // Le décompte de la section reste celui des tâches distinctes.
    expect(todos).toHaveLength(1);
  });

  it('regroupe les tâches sans tag en dernier', () => {
    const sections = organizeTodos(
      [
        makeTodo({ title: 'Sans tag', dueDate: iso('2026-03-10') }),
        makeTodo({ title: 'Avec tag', dueDate: iso('2026-03-10'), tagIds: [WORK] }),
      ],
      { now: TODAY, tagOrder: [WORK] },
    );

    expect(sectionOf(sections, 'today').groups.map((group) => group.tagId)).toEqual([WORK, null]);
  });

  it('suit l’ordre des tags fourni', () => {
    const sections = organizeTodos(
      [
        makeTodo({ dueDate: iso('2026-03-10'), tagIds: [WORK] }),
        makeTodo({ dueDate: iso('2026-03-10'), tagIds: [HOME] }),
      ],
      { now: TODAY, tagOrder: [HOME, WORK] },
    );

    expect(sectionOf(sections, 'today').groups.map((group) => group.tagId)).toEqual([HOME, WORK]);
  });

  it('compte ce qu’il reste à faire, pas le total', () => {
    const sections = organizeTodos(
      [
        makeTodo({ dueDate: iso('2026-03-10'), tagIds: [WORK] }),
        makeTodo({
          dueDate: iso('2026-03-10'),
          tagIds: [WORK],
          status: 'done',
          completedAt: TODAY,
        }),
      ],
      { now: TODAY, tagOrder: [WORK] },
    );

    const [group] = sectionOf(sections, 'today').groups;

    expect(group?.todos).toHaveLength(2);
    expect(group?.remaining).toBe(1);
  });
});

describe('countTodosDueNow', () => {
  it('compte le retard et le jour, sans le futur ni le terminé', () => {
    const count = countTodosDueNow(
      [
        makeTodo({ dueDate: iso('2026-03-04') }),
        makeTodo({ dueDate: iso('2026-03-10') }),
        makeTodo({ dueDate: iso('2026-03-11') }),
        makeTodo({ dueDate: iso('2026-03-10'), status: 'done', completedAt: TODAY }),
        makeTodo({ dueDate: null }),
      ],
      TODAY,
    );

    expect(count).toBe(2);
  });
});
