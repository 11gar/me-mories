import { describe, expect, it } from 'vitest';

import { fixedRandom, makeMemory } from '@/test/factories';

import {
  orderForReview,
  pickOnThisDay,
  pickRandomInWindow,
  pickWeightedRandom,
  reviewWeight,
} from './memorySelection';

const NOW = new Date(2026, 7, 2, 12, 0);
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 86_400_000);

describe('reviewWeight', () => {
  it('privilégie une mémoire jamais revue', () => {
    const never = makeMemory({ lastReviewedAt: null });
    const justReviewed = makeMemory({ lastReviewedAt: NOW, reviewCount: 1 });

    expect(reviewWeight(never, NOW)).toBeGreaterThan(reviewWeight(justReviewed, NOW));
  });

  it('augmente avec le temps écoulé depuis la dernière relecture', () => {
    const old = makeMemory({ lastReviewedAt: daysAgo(200), reviewCount: 1 });
    const recent = makeMemory({ lastReviewedAt: daysAgo(2), reviewCount: 1 });

    expect(reviewWeight(old, NOW)).toBeGreaterThan(reviewWeight(recent, NOW));
  });

  it('diminue quand la mémoire a déjà été beaucoup revue', () => {
    const seenOnce = makeMemory({ lastReviewedAt: daysAgo(30), reviewCount: 1 });
    const seenOften = makeMemory({ lastReviewedAt: daysAgo(30), reviewCount: 20 });

    expect(reviewWeight(seenOften, NOW)).toBeLessThan(reviewWeight(seenOnce, NOW));
  });

  it('reste strictement positif', () => {
    const heavilyReviewed = makeMemory({ lastReviewedAt: NOW, reviewCount: 1000 });

    expect(reviewWeight(heavilyReviewed, NOW)).toBeGreaterThan(0);
  });
});

describe('pickWeightedRandom', () => {
  it('ne tire jamais une mémoire en corbeille', () => {
    const deleted = makeMemory({ deletedAt: NOW });

    expect(pickWeightedRandom([deleted], 5, { now: NOW })).toEqual([]);
  });

  it('ne tire jamais deux fois la même mémoire', () => {
    const memories = [makeMemory(), makeMemory(), makeMemory()];

    const picked = pickWeightedRandom(memories, 3, { now: NOW, random: fixedRandom([0.5]) });

    expect(new Set(picked.map((memory) => memory.id)).size).toBe(3);
  });

  it('ne renvoie pas plus que ce qui est disponible', () => {
    const memories = [makeMemory(), makeMemory()];

    expect(pickWeightedRandom(memories, 10, { now: NOW })).toHaveLength(2);
  });

  it('respecte la liste d’exclusion', () => {
    const kept = makeMemory();
    const excluded = makeMemory();

    const picked = pickWeightedRandom([kept, excluded], 2, {
      now: NOW,
      exclude: new Set([excluded.id]),
    });

    expect(picked).toEqual([kept]);
  });

  it('favorise statistiquement la mémoire la plus délaissée', () => {
    const neglected = makeMemory({ lastReviewedAt: null });
    const fresh = makeMemory({ lastReviewedAt: NOW, reviewCount: 30 });

    let neglectedFirst = 0;
    for (let run = 0; run < 400; run += 1) {
      const [first] = pickWeightedRandom([fresh, neglected], 1, { now: NOW });
      if (first?.id === neglected.id) neglectedFirst += 1;
    }

    // Poids ≈ 366 contre ≈ 0,02 : la mémoire délaissée doit dominer nettement.
    expect(neglectedFirst).toBeGreaterThan(380);
  });

  it('renvoie une liste vide pour un ensemble vide', () => {
    expect(pickWeightedRandom([], 3, { now: NOW })).toEqual([]);
  });
});

describe('pickRandomInWindow', () => {
  it('ne retient que les mémoires créées dans la fenêtre', () => {
    const inside = makeMemory({ createdAt: daysAgo(3) });
    const tooOld = makeMemory({ createdAt: daysAgo(40) });

    const picked = pickRandomInWindow([inside, tooOld], { from: daysAgo(7), to: NOW }, 10, {
      now: NOW,
    });

    expect(picked).toEqual([inside]);
  });

  it('exclut la borne haute', () => {
    const atUpperBound = makeMemory({ createdAt: NOW });

    const picked = pickRandomInWindow([atUpperBound], { from: daysAgo(7), to: NOW }, 10, {
      now: NOW,
    });

    expect(picked).toEqual([]);
  });
});

describe('pickOnThisDay', () => {
  it('retient le même jour des années précédentes', () => {
    const lastYear = makeMemory({ createdAt: new Date(2025, 7, 2, 9, 0) });
    const twoYearsAgo = makeMemory({ createdAt: new Date(2024, 7, 2, 9, 0) });
    const otherDay = makeMemory({ createdAt: new Date(2025, 7, 3, 9, 0) });
    const today = makeMemory({ createdAt: new Date(2026, 7, 2, 9, 0) });

    const picked = pickOnThisDay([otherDay, twoYearsAgo, today, lastYear], NOW);

    expect(picked.map((memory) => memory.id)).toEqual([lastYear.id, twoYearsAgo.id]);
  });

  it('ignore les mémoires en corbeille', () => {
    const deleted = makeMemory({ createdAt: new Date(2025, 7, 2), deletedAt: NOW });

    expect(pickOnThisDay([deleted], NOW)).toEqual([]);
  });
});

describe('orderForReview', () => {
  it('renvoie toutes les mémoires actives, sans doublon', () => {
    const memories = [makeMemory(), makeMemory(), makeMemory({ deletedAt: NOW })];

    const ordered = orderForReview(memories, { now: NOW });

    expect(ordered).toHaveLength(2);
    expect(new Set(ordered.map((memory) => memory.id)).size).toBe(2);
  });
});
