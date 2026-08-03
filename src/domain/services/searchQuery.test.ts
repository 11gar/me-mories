import { describe, expect, it } from 'vitest';

import { makeMemory } from '@/test/factories';

import { asDateTagId, asTagId } from '../models/ids';
import { asIsoDate as isoDate } from '../models/isoDate';
import {
  criteriaFromSearchParams,
  criteriaToSearchParams,
  countActiveFilters,
  emptySearchCriteria,
  hasActiveFilters,
  matchesStructuralCriteria,
} from './searchQuery';
import type { SearchCriteria } from './searchQuery';

const TAG_A = asTagId('tag-a');
const TAG_B = asTagId('tag-b');
const DATE_TAG = asDateTagId('date-tag-1');

const criteria = (overrides: Partial<SearchCriteria> = {}): SearchCriteria => ({
  ...emptySearchCriteria,
  ...overrides,
});

describe('matchesStructuralCriteria', () => {
  it('exclut par défaut les mémoires en corbeille', () => {
    const trashed = makeMemory({ deletedAt: new Date(2026, 0, 5) });

    expect(matchesStructuralCriteria(trashed, criteria())).toBe(false);
    expect(matchesStructuralCriteria(trashed, criteria({ scope: 'trash' }))).toBe(true);
  });

  it('exclut les mémoires actives du périmètre corbeille', () => {
    expect(matchesStructuralCriteria(makeMemory(), criteria({ scope: 'trash' }))).toBe(false);
  });

  describe('filtrage par tags', () => {
    it('combine les tags en ET par défaut', () => {
      const both = makeMemory({ tagIds: [TAG_A, TAG_B] });
      const onlyA = makeMemory({ tagIds: [TAG_A] });
      const filter = criteria({ tagIds: [TAG_A, TAG_B] });

      expect(matchesStructuralCriteria(both, filter)).toBe(true);
      expect(matchesStructuralCriteria(onlyA, filter)).toBe(false);
    });

    it('élargit en OU quand tagMatch vaut "any"', () => {
      const onlyA = makeMemory({ tagIds: [TAG_A] });
      const filter = criteria({ tagIds: [TAG_A, TAG_B], tagMatch: 'any' });

      expect(matchesStructuralCriteria(onlyA, filter)).toBe(true);
    });

    it('ignore le filtre quand aucun tag n’est sélectionné', () => {
      expect(matchesStructuralCriteria(makeMemory(), criteria())).toBe(true);
    });
  });

  it('filtre par DateTag', () => {
    const tagged = makeMemory({ dateTagIds: [DATE_TAG] });
    const filter = criteria({ dateTagIds: [DATE_TAG] });

    expect(matchesStructuralCriteria(tagged, filter)).toBe(true);
    expect(matchesStructuralCriteria(makeMemory(), filter)).toBe(false);
  });

  it('ne garde que les mémoires sans aucun tag quand untaggedOnly est actif', () => {
    const filter = criteria({ untaggedOnly: true });

    expect(matchesStructuralCriteria(makeMemory(), filter)).toBe(true);
    expect(matchesStructuralCriteria(makeMemory({ tagIds: [TAG_A] }), filter)).toBe(false);
    expect(matchesStructuralCriteria(makeMemory({ dateTagIds: [DATE_TAG] }), filter)).toBe(false);
  });

  describe('période de création', () => {
    const onMarch12 = makeMemory({ createdAt: new Date(2024, 2, 12, 15, 30) });

    it('inclut les bornes, sur la journée entière', () => {
      expect(
        matchesStructuralCriteria(
          onMarch12,
          criteria({ createdFrom: isoDate('2024-03-12'), createdTo: isoDate('2024-03-12') }),
        ),
      ).toBe(true);
    });

    it('exclut ce qui précède la borne de début', () => {
      expect(
        matchesStructuralCriteria(onMarch12, criteria({ createdFrom: isoDate('2024-03-13') })),
      ).toBe(false);
    });

    it('exclut ce qui suit la borne de fin', () => {
      expect(
        matchesStructuralCriteria(onMarch12, criteria({ createdTo: isoDate('2024-03-11') })),
      ).toBe(false);
    });

    it('inclut une mémoire créée juste avant minuit le dernier jour', () => {
      const lateNight = makeMemory({ createdAt: new Date(2024, 2, 12, 23, 59, 59) });

      expect(
        matchesStructuralCriteria(lateNight, criteria({ createdTo: isoDate('2024-03-12') })),
      ).toBe(true);
    });
  });

  it('combine plusieurs critères simultanément', () => {
    const memory = makeMemory({
      tagIds: [TAG_A, TAG_B],
      dateTagIds: [DATE_TAG],
      createdAt: new Date(2024, 2, 12),
    });

    const filter = criteria({
      tagIds: [TAG_A, TAG_B],
      dateTagIds: [DATE_TAG],
      createdFrom: isoDate('2024-03-01'),
      createdTo: isoDate('2024-03-31'),
    });

    expect(matchesStructuralCriteria(memory, filter)).toBe(true);
    expect(
      matchesStructuralCriteria(memory, { ...filter, createdFrom: isoDate('2024-04-01') }),
    ).toBe(false);
  });
});

describe('hasActiveFilters / countActiveFilters', () => {
  it('considère les critères vides comme inactifs', () => {
    expect(hasActiveFilters(emptySearchCriteria)).toBe(false);
    expect(countActiveFilters(emptySearchCriteria)).toBe(0);
  });

  it('ignore les espaces dans le texte', () => {
    expect(hasActiveFilters(criteria({ text: '   ' }))).toBe(false);
    expect(hasActiveFilters(criteria({ text: 'café' }))).toBe(true);
  });

  it('compte chaque famille de filtre une seule fois', () => {
    expect(countActiveFilters(criteria({ tagIds: [TAG_A, TAG_B] }))).toBe(1);
    expect(
      countActiveFilters(
        criteria({ createdFrom: isoDate('2024-01-01'), createdTo: isoDate('2024-12-31') }),
      ),
    ).toBe(1);
  });
});

describe('sérialisation dans l’URL', () => {
  it('n’écrit que les valeurs non défaut', () => {
    expect(criteriaToSearchParams(emptySearchCriteria).toString()).toBe('');
  });

  it('fait un aller-retour complet', () => {
    const original = criteria({
      text: 'café kitsuné',
      tagIds: [TAG_A, TAG_B],
      dateTagIds: [DATE_TAG],
      tagMatch: 'any',
      createdFrom: isoDate('2024-01-01'),
      createdTo: isoDate('2024-12-31'),
      untaggedOnly: true,
      scope: 'trash',
      sort: 'oldest',
    });

    const restored = criteriaFromSearchParams(criteriaToSearchParams(original));

    expect(restored).toEqual(original);
  });

  it('retombe sur les valeurs par défaut face à des paramètres invalides', () => {
    const params = new URLSearchParams({
      match: 'n-importe-quoi',
      sort: 'bidon',
      scope: 'inconnu',
      from: 'pas-une-date',
    });

    const restored = criteriaFromSearchParams(params);

    expect(restored.tagMatch).toBe('all');
    expect(restored.sort).toBe('relevance');
    expect(restored.scope).toBe('active');
    expect(restored.createdFrom).toBeNull();
  });

  it('ignore les identifiants vides dans une liste', () => {
    const params = new URLSearchParams({ tags: 'tag-a,,tag-b, ' });

    expect(criteriaFromSearchParams(params).tagIds).toEqual([asTagId('tag-a'), asTagId('tag-b')]);
  });
});
