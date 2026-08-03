import { describe, expect, it } from 'vitest';

import { makeMemory } from '@/test/factories';

import { asTagId } from '../models/ids';
import { asIsoDate } from '../models/isoDate';
import { computeStats, countByDateTag, countByDay, countByTag } from './stats';

const NOW = new Date(2026, 7, 2, 12, 0); // dimanche 2 août 2026
const on = (year: number, month: number, day: number) => new Date(year, month - 1, day, 10, 0);

describe('computeStats', () => {
  it('gère une base vide', () => {
    const stats = computeStats([], NOW);

    expect(stats.total).toBe(0);
    expect(stats.currentStreak).toBe(0);
    expect(stats.longestStreak).toBe(0);
    expect(stats.firstCaptureAt).toBeNull();
  });

  it('sépare les mémoires actives de la corbeille', () => {
    const stats = computeStats([makeMemory(), makeMemory({ deletedAt: NOW })], NOW);

    expect(stats.total).toBe(1);
    expect(stats.inTrash).toBe(1);
  });

  it('compte les mémoires sans aucun tag', () => {
    const stats = computeStats([makeMemory(), makeMemory({ tagIds: [asTagId('tag-a')] })], NOW);

    expect(stats.untagged).toBe(1);
  });

  it('compte les créations du jour, de la semaine et du mois', () => {
    const memories = [
      makeMemory({ createdAt: on(2026, 8, 2) }), // aujourd'hui
      makeMemory({ createdAt: on(2026, 7, 30) }), // jeudi, même semaine ISO
      makeMemory({ createdAt: on(2026, 7, 15) }), // mois précédent
    ];

    const stats = computeStats(memories, NOW);

    expect(stats.createdToday).toBe(1);
    // Semaine ISO du lundi 27 juillet au dimanche 2 août.
    expect(stats.createdThisWeek).toBe(2);
    expect(stats.createdThisMonth).toBe(1);
  });

  it('retient la toute première capture', () => {
    const stats = computeStats(
      [makeMemory({ createdAt: on(2026, 5, 3) }), makeMemory({ createdAt: on(2024, 1, 9) })],
      NOW,
    );

    expect(stats.firstCaptureAt).toEqual(on(2024, 1, 9));
  });

  describe('séries', () => {
    it('compte les jours consécutifs jusqu’à aujourd’hui', () => {
      const memories = [
        makeMemory({ createdAt: on(2026, 8, 2) }),
        makeMemory({ createdAt: on(2026, 8, 1) }),
        makeMemory({ createdAt: on(2026, 7, 31) }),
      ];

      expect(computeStats(memories, NOW).currentStreak).toBe(3);
    });

    it('ne casse pas la série si rien n’a encore été noté aujourd’hui', () => {
      const memories = [
        makeMemory({ createdAt: on(2026, 8, 1) }),
        makeMemory({ createdAt: on(2026, 7, 31) }),
      ];

      expect(computeStats(memories, NOW).currentStreak).toBe(2);
    });

    it('casse la série si hier est vide', () => {
      const memories = [makeMemory({ createdAt: on(2026, 7, 30) })];

      expect(computeStats(memories, NOW).currentStreak).toBe(0);
    });

    it('retient la plus longue série jamais atteinte', () => {
      const memories = [
        makeMemory({ createdAt: on(2026, 3, 1) }),
        makeMemory({ createdAt: on(2026, 3, 2) }),
        makeMemory({ createdAt: on(2026, 3, 3) }),
        makeMemory({ createdAt: on(2026, 3, 4) }),
        makeMemory({ createdAt: on(2026, 8, 2) }),
      ];

      const stats = computeStats(memories, NOW);

      expect(stats.longestStreak).toBe(4);
      expect(stats.currentStreak).toBe(1);
    });

    it('ne compte qu’une fois plusieurs mémoires du même jour', () => {
      const memories = [
        makeMemory({ createdAt: on(2026, 8, 2) }),
        makeMemory({ createdAt: new Date(2026, 7, 2, 18, 0) }),
      ];

      const stats = computeStats(memories, NOW);

      expect(stats.currentStreak).toBe(1);
      expect(stats.activeDays).toBe(1);
    });

    it('traverse un changement de mois', () => {
      const memories = [
        makeMemory({ createdAt: on(2026, 8, 2) }),
        makeMemory({ createdAt: on(2026, 8, 1) }),
        makeMemory({ createdAt: on(2026, 7, 31) }),
        makeMemory({ createdAt: on(2026, 7, 30) }),
      ];

      expect(computeStats(memories, NOW).currentStreak).toBe(4);
    });
  });
});

describe('agrégations', () => {
  it('compte les mémoires par jour', () => {
    const counts = countByDay([
      makeMemory({ createdAt: on(2026, 8, 2) }),
      makeMemory({ createdAt: new Date(2026, 7, 2, 20, 0) }),
      makeMemory({ createdAt: on(2026, 8, 1) }),
      makeMemory({ createdAt: on(2026, 8, 1), deletedAt: NOW }),
    ]);

    expect(counts.get(asIsoDate('2026-08-02'))).toBe(2);
    expect(counts.get(asIsoDate('2026-08-01'))).toBe(1);
  });

  it('compte l’usage de chaque tag', () => {
    const tagA = asTagId('tag-a');
    const tagB = asTagId('tag-b');

    const counts = countByTag([
      makeMemory({ tagIds: [tagA, tagB] }),
      makeMemory({ tagIds: [tagA] }),
      makeMemory({ tagIds: [tagA], deletedAt: NOW }),
    ]);

    expect(counts.get(tagA)).toBe(2);
    expect(counts.get(tagB)).toBe(1);
  });

  it('compte l’usage de chaque DateTag', () => {
    const counts = countByDateTag([makeMemory({ dateTagIds: [] }), makeMemory()]);

    expect(counts.size).toBe(0);
  });
});
